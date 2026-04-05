import { useEffect, useMemo, useRef, useState } from "react";
import { type PdfDocumentProxyLite, usePdfDocument } from "../hooks/usePdfDocument";
import { PanelFrame } from "../layout/PanelFrame";
import { selectActiveReferenceDocument, useWorkspaceStore } from "../store";

const renderPdfPage = async (
  canvas: HTMLCanvasElement,
  documentProxy: PdfDocumentProxyLite,
  pageNumber: number,
  zoom: number
) => {
  const page = await documentProxy.getPage(pageNumber);
  const viewport = page.getViewport({ scale: zoom });
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, canvasContext: context, viewport }).promise;
};

export const ReferenceViewerPanel = () => {
  const document = useWorkspaceStore(selectActiveReferenceDocument);
  const referenceShelf = useWorkspaceStore((state) => state.referenceShelf);
  const saveReferenceNote = useWorkspaceStore((state) => state.saveReferenceNote);
  const pinReferenceToRole = useWorkspaceStore((state) => state.pinReferenceToRole);
  const { documentProxy, pageTexts, loading, error, fromCache } = usePdfDocument(document);
  const [zoom, setZoom] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfSearch, setPdfSearch] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPageNumber(1);
    setPdfSearch("");
    setPan({ x: 0, y: 0 });
  }, [document?.id]);

  useEffect(() => {
    if (!canvasRef.current || !documentProxy || document?.type !== "pdf") {
      return;
    }

    void renderPdfPage(canvasRef.current, documentProxy, pageNumber, zoom);
  }, [document?.type, documentProxy, pageNumber, zoom]);

  const matchingPdfPages = useMemo(() => {
    if (!pdfSearch.trim()) {
      return pageTexts;
    }

    const normalized = pdfSearch.trim().toLowerCase();
    return pageTexts.filter((entry) => entry.text.toLowerCase().includes(normalized));
  }, [pageTexts, pdfSearch]);

  return (
    <PanelFrame
      title="Reference Viewer"
      status={document ? document.type.toUpperCase() : "Idle"}
      actions={
        document ? (
          <div className="reference-viewer-actions">
            <button className="ghost-button" onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))}>
              -
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button className="ghost-button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}>
              +
            </button>
          </div>
        ) : undefined
      }
    >
      {!document ? (
        <div className="empty-state">Select a chart or reference from the shelf.</div>
      ) : (
        <div className="reference-viewer">
          <div className="reference-meta">
            <strong>{document.title}</strong>
            <span>
              {[document.airportIcao ?? "General", document.category.replaceAll("_", " "), document.sourceKind.replaceAll("_", " ")].join(" · ")}
            </span>
            {document.type === "pdf" ? <span>{fromCache ? "PDF text cache hit" : "PDF text live-loaded"}</span> : null}
            {document.georeference?.notes ? <span>{document.georeference.notes}</span> : null}
          </div>

          {document.type === "image" ? (
            <div
              className="image-viewer-stage"
              onWheel={(event) => {
                event.preventDefault();
                setZoom((value) => Math.min(3, Math.max(0.5, value + (event.deltaY > 0 ? -0.1 : 0.1))));
              }}
              onMouseMove={(event) => {
                if ((event.buttons & 1) === 1) {
                  setPan((value) => ({ x: value.x + event.movementX, y: value.y + event.movementY }));
                }
              }}
            >
              <img
                src={document.sourcePath}
                alt={document.title}
                className="reference-image"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              />
            </div>
          ) : null}

          {document.type === "pdf" ? (
            <div className="pdf-viewer">
              <div className="pdf-toolbar">
                <button className="ghost-button" onClick={() => setPageNumber((value) => Math.max(1, value - 1))}>
                  Prev
                </button>
                <span>
                  Page {pageNumber} / {documentProxy?.numPages ?? "--"}
                </span>
                <button
                  className="ghost-button"
                  onClick={() => setPageNumber((value) => Math.min(documentProxy?.numPages ?? value, value + 1))}
                >
                  Next
                </button>
                <input
                  className="filter-input"
                  value={pdfSearch}
                  onChange={(event) => setPdfSearch(event.target.value)}
                  placeholder="Search inside PDF"
                />
              </div>
              <div className="pdf-search-results">
                {pdfSearch ? (
                  matchingPdfPages.length ? (
                    matchingPdfPages.slice(0, 6).map((entry) => (
                      <button
                        key={entry.pageNumber}
                        className="reference-result"
                        onClick={() => setPageNumber(entry.pageNumber)}
                      >
                        <strong>Page {entry.pageNumber}</strong>
                        <span>{entry.text.slice(0, 180) || "Text unavailable"}</span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state compact">No PDF text matches.</div>
                  )
                ) : null}
              </div>
              <div className="pdf-canvas-stage">
                {loading ? <div className="empty-state compact">Loading PDF...</div> : null}
                {error ? <div className="empty-state compact">{error}</div> : null}
                <canvas ref={canvasRef} className="pdf-canvas" />
              </div>
            </div>
          ) : null}

          {document.type === "text" ? (
            <div className="text-reference-view">{document.parsedText ?? "No indexed text available."}</div>
          ) : null}

          <label className="field-label">
            View role pin
            <div className="reference-chip-row">
              <button className="chip-button" onClick={() => void pinReferenceToRole("ground_reference", document.id)}>
                Pin Ground
              </button>
              <button className="chip-button" onClick={() => void pinReferenceToRole("airspace_reference", document.id)}>
                Pin Airspace
              </button>
              <button className="chip-button" onClick={() => void pinReferenceToRole("reading_reference", document.id)}>
                Pin Reading
              </button>
            </div>
          </label>

          <label className="field-label">
            Controller note
            <textarea
              className="composer-input compact"
              value={referenceShelf.notesByDocumentId[document.id] ?? ""}
              onChange={(event) => void saveReferenceNote(document.id, event.target.value)}
              placeholder="Pin a short operating note for this chart/reference."
            />
          </label>
        </div>
      )}
    </PanelFrame>
  );
};
