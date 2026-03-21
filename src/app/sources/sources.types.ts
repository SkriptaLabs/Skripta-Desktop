// Datenmodell für eine Quelle / ein Zitat
export interface Source {
  id: string;
  title: string;
  authors?: string[];
  year?: number;
  url?: string;
  quotes: Quote[];
  createdAt: string;
}

export interface Quote {
  id: string;
  text: string;
  page?: string;
  note?: string;
}
