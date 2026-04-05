import type { ReferenceDocument, ReferenceSearchResult } from "./types";

const createSnippet = (text: string, query: string): string => {
  const normalizedText = text.toLowerCase();
  const index = normalizedText.indexOf(query);
  if (index < 0) {
    return text.slice(0, 140);
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 70);
  return text.slice(start, end).trim();
};

export const searchReferenceDocuments = (
  documents: ReferenceDocument[],
  query: string
): ReferenceSearchResult[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return documents
    .flatMap<ReferenceSearchResult>((document) => {
      const haystacks = [document.title, ...(document.tags ?? []), document.parsedText ?? ""];
      const score = haystacks.reduce((sum, value) => sum + Number(value.toLowerCase().includes(normalized)), 0);

      if (!score) {
        return [];
      }

      return [
        {
          documentId: document.id,
          title: document.title,
          category: document.category,
          airportIcao: document.airportIcao,
          snippet: createSnippet(document.parsedText ?? document.title, normalized),
          score,
          matchReason: document.title.toLowerCase().includes(normalized)
            ? "Title match"
            : document.tags.some((tag) => tag.toLowerCase().includes(normalized))
              ? "Tag match"
              : "Indexed text match"
        }
      ];
    })
    .sort((left, right) => right.score - left.score);
};
