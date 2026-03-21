use std::sync::{Arc, Mutex};
use tauri::State;

struct ServerPortState(Arc<Mutex<Option<u16>>>);

/// Gibt den dynamischen Port des laufenden lokalen Servers zurück.
/// Wird solange None zurückgeben bis der Server den Port in /tmp/scripta-server.port geschrieben hat.
#[tauri::command]
fn get_server_port(state: State<'_, ServerPortState>) -> Option<u16> {
    *state.0.lock().unwrap()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let port_state = Arc::new(Mutex::new(None::<u16>));

    tauri::Builder::default()
        .manage(ServerPortState(port_state.clone()))
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Hintergrund-Thread: wartet bis der Server seinen Port in die Temp-Datei schreibt
            let state = port_state.clone();
            std::thread::spawn(move || {
                let port_file = std::env::temp_dir().join("scripta-server.port");
                loop {
                    if let Ok(content) = std::fs::read_to_string(&port_file) {
                        if let Ok(port) = content.trim().parse::<u16>() {
                            *state.lock().unwrap() = Some(port);
                            break;
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_server_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
