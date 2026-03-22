export interface Space {
  id: string;
  name: string;
  description: string;
  userspaceUrl: string;
  aispaceUrl: string;
  // points to automerge doc
  sourcesUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpacesCollection {
  spaces: Record<string, Space>;
}
