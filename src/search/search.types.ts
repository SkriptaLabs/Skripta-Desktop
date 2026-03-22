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

export type AcademicEngine = "openalex" | "semanticscholar" | "arxiv";

export interface SearchConfig {
  academic: AcademicEngine[];
  web: boolean;
}
