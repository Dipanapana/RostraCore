// RostraCore Desktop Application
// Wraps the web frontend in a native Windows window using Tauri v2

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running RostraCore Desktop");
}
