import { invoke } from "@tauri-apps/api/core";

// Fragt den Tauri-Core nach dem laufenden Server-Port
export async function getServerPort(): Promise<number> {
  return invoke<number>("get_server_port");
}
