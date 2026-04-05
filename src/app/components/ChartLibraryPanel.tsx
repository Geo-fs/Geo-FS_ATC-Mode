import { useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { PanelFrame } from "../layout/PanelFrame";
import {
  selectAllReferenceDocuments,
  selectRecommendedReferenceDocuments,
  selectReferenceSearchResults,
  useWorkspaceStore
} from "../store";
import type { ReferenceViewRole } from "../../domain/references/types";

export const ChartLibraryPanel = () => {
  const {
    documents,
    recommendations,
    searchResults,
    activeAirport,
    referenceShelf,
    referenceQuery,
    setReferenceQuery,
    selectReferenceDocument,
    toggleReferenceFavorite,
    toggleReferencePin,
    pinReferenceToRole,
    importReferenceFiles
  } = useWorkspaceStore(
    useShallow((state) => ({
      documents: selectAllReferenceDocuments(state),
      recommendations: selectRecommendedReferenceDocuments(state),
      searchResults: selectReferenceSearchResults(state),
      activeAirport: state.activeAirport,
      referenceShelf: state.referenceShelf,
      referenceQuery: state.referenceQuery,
      setReferenceQuery: state.setReferenceQuery,
      selectReferenceDocument: state.selectReferenceDocument,
      toggleReferenceFavorite: state.toggleReferenceFavorite,
      toggleReferencePin: state.toggleReferencePin,
      pinReferenceToRole: state.pinReferenceToRole,
      importReferenceFiles: state.importReferenceFiles
    }))
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const airportDocuments = useMemo(
    () =>
      documents.filter(
        (document) => document.airportIcao == null || document.airportIcao === activeAirport.icao
      ),
    [activeAirport.icao, documents]
  );
  const importedDocuments = useMemo(
    () => documents.filter((document) => document.sourceKind === "imported_file"),
    [documents]
  );
  const pinnedByRole = useMemo(
    () =>
      Object.entries(referenceShelf.pinnedByRole).filter((entry): entry is [ReferenceViewRole, string] =>
        Boolean(entry[1])
      ),
    [referenceShelf.pinnedByRole]
  );

  return (
    <PanelFrame
      title="Reference Shelf"
      status={`${airportDocuments.length} airport docs`}
      actions={
        <>
          <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
            Import PDF/Image
          </button>
          <input
            ref={fileInputRef}
            hidden
            multiple
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/jpg,text/plain"
            onChange={(event) => {
              const files = event.target.files;
              if (files?.length) {
                void importReferenceFiles(files);
              }
              event.currentTarget.value = "";
            }}
          />
        </>
      }
    >
      <div className="reference-panel">
        <input
          className="filter-input"
          value={referenceQuery}
          onChange={(event) => setReferenceQuery(event.target.value)}
          placeholder="Search charts, phraseology, references"
        />
        <div className="reference-section">
          <span className="eyebrow">Recommended</span>
          <div className="reference-chip-row">
            {recommendations.slice(0, 4).map((document) => (
              <button
                key={document.id}
                className="chip-button"
                onClick={() => void selectReferenceDocument(document.id)}
              >
                {document.title}
              </button>
            ))}
          </div>
        </div>
        {pinnedByRole.length ? (
          <div className="reference-section">
            <span className="eyebrow">Pinned By Role</span>
            <div className="reference-list compact-list">
              {pinnedByRole.map(([role, documentId]) => {
                const document = documents.find((item) => item.id === documentId);
                if (!document) {
                  return null;
                }

                return (
                  <button
                    key={role}
                    className="reference-result"
                    onClick={() => void selectReferenceDocument(document.id)}
                  >
                    <strong>{role.replace("_reference", "").replace("_", " ")}</strong>
                    <span>{document.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {referenceQuery ? (
          <div className="reference-results">
            {searchResults.length === 0 ? (
              <div className="empty-state compact">No reference matches.</div>
            ) : (
              searchResults.slice(0, 8).map((result) => (
                <button
                  key={result.documentId}
                  className="reference-result"
                  onClick={() => void selectReferenceDocument(result.documentId)}
                >
                  <strong>{result.title}</strong>
                  <span className="reference-match-reason">{result.matchReason}</span>
                  <span>{result.snippet}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="reference-section">
              <span className="eyebrow">Airport Library</span>
              <div className="reference-list">
                {airportDocuments.map((document) => {
                  const favorite = referenceShelf.favoriteDocumentIds.includes(document.id);
                  const pinned = referenceShelf.pinnedDocumentIds.includes(document.id);
                  const active = referenceShelf.activeDocumentId === document.id;

                  return (
                    <article
                      key={document.id}
                      className={active ? "reference-card active" : "reference-card"}
                    >
                      <button
                        className="reference-open"
                        onClick={() => void selectReferenceDocument(document.id)}
                      >
                        <strong>{document.title}</strong>
                        <span>{document.category.replaceAll("_", " ")}</span>
                      </button>
                      <div className="reference-actions-row">
                        <button
                          className={favorite ? "focus-pill active" : "focus-pill"}
                          onClick={() => void toggleReferenceFavorite(document.id)}
                        >
                          {favorite ? "Favorite" : "Fav"}
                        </button>
                        <button
                          className={pinned ? "focus-pill active" : "focus-pill"}
                          onClick={() => void toggleReferencePin(document.id)}
                        >
                          {pinned ? "Pinned" : "Pin"}
                        </button>
                        {(["ground_reference", "airspace_reference", "reading_reference"] as ReferenceViewRole[]).map((role) => (
                          <button
                            key={role}
                            className={
                              referenceShelf.pinnedByRole[role] === document.id
                                ? "focus-pill active"
                                : "focus-pill"
                            }
                            onClick={() => void pinReferenceToRole(role, document.id)}
                          >
                            {role === "ground_reference"
                              ? "Ground"
                              : role === "airspace_reference"
                                ? "Airspace"
                                : "Read"}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            {importedDocuments.length ? (
              <div className="reference-section">
                <span className="eyebrow">Session Imports</span>
                <div className="reference-list compact-list">
                  {importedDocuments.map((document) => (
                    <button
                      key={document.id}
                      className="reference-result"
                      onClick={() => void selectReferenceDocument(document.id)}
                    >
                      <strong>{document.title}</strong>
                      <span>Session file</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PanelFrame>
  );
};
