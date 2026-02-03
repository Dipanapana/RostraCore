// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_store::StoreExt;

// IPC Commands for renderer process communication
#[tauri::command]
async fn get_stored_data(app: tauri::AppHandle, key: String) -> Result<Option<serde_json::Value>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    Ok(store.get(key))
}

#[tauri::command]
async fn set_stored_data(app: tauri::AppHandle, key: String, value: serde_json::Value) -> Result<bool, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set(key, value);
    store.save().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn delete_stored_data(app: tauri::AppHandle, key: String) -> Result<bool, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.delete(key);
    store.save().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn clear_stored_data(app: tauri::AppHandle) -> Result<bool, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.clear();
    store.save().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn get_app_version(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[tauri::command]
async fn is_development() -> Result<bool, String> {
    Ok(cfg!(debug_assertions))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_stored_data,
            set_stored_data,
            delete_stored_data,
            clear_stored_data,
            get_app_version,
            is_development
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
