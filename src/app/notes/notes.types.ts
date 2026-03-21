// Datenmodell für eine Notiz
export interface Note {
  id: string;
  title: string;
  content: string;
  space: "userspace" | "aispace";
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface CreateNoteDto {
  title: string;
  content: string;
  space: "userspace" | "aispace";
  tags?: string[];
}
