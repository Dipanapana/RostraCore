// Database module for SQLite local caching
pub mod migrations;
pub mod commands;

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get the path to the SQLite database file in app data directory
pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_data_dir.join("rostracore.db"))
}

/// Initialize the database (called at app startup)
pub fn init_db() -> Result<(), String> {
    println!("Database module initialized");
    Ok(())
}
