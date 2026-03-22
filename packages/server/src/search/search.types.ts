export type SearchEngine = "openalex" | "semanticscholar" | "arxiv" | "brave";

export interface SearchResult {
  title: string;
  authors?: string[];
  year?: number;
  url?: string;
  abstract?: string;
  source: SearchEngine;
  doi?: string;
}

export interface AcademicSearchOptions {
  engine?: "openalex" | "semanticscholar" | "arxiv";
  limit?: number;
}

export interface WebSearchOptions {
  limit?: number;
}
