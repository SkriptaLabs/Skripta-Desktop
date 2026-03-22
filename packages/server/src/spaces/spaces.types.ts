export interface Space {
  id: number;
  name: string;
  description: string;
  userspaceUrl: string;
  aispaceUrl: string;
  sourcesUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpacesCollection {
  spaces: Record<number, Space>;
}
