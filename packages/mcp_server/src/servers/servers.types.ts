export interface SyncServer {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface SyncServerWithMeta extends SyncServer {
  isLocal: boolean;
}
