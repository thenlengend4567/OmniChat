// Prevents additional console window on Windows in release, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{create_dir_all, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{State, Manager, Emitter};

// Define structure for synchronizing user session and cookie credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub token: String,
    pub user_id: String,
    pub email: String,
    pub expires_at: u64,
    pub cookies: Vec<String>,
}

// Global thread-safe state for holding the active session in memory
pub struct AppState {
    pub session: Mutex<Option<SessionData>>,
}

// Helper function to get the path to the secure session storage file in Tauri v2
fn get_session_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    
    // Ensure the directory exists
    create_dir_all(&path).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    path.push("session.json");
    Ok(path)
}

// Save the session data to a secure file on disk
fn save_session_to_disk(app_handle: &tauri::AppHandle, session: &SessionData) -> Result<(), String> {
    let path = get_session_file_path(app_handle)?;
    let serialized = serde_json::to_string(session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;
    
    let mut file = File::create(path).map_err(|e| format!("Failed to create session file: {}", e))?;
    file.write_all(serialized.as_bytes())
        .map_err(|e| format!("Failed to write session file: {}", e))?;
    
    Ok(())
}

// Load the session data from disk if it exists
fn load_session_from_disk(app_handle: &tauri::AppHandle) -> Result<Option<SessionData>, String> {
    let path = get_session_file_path(app_handle)?;
    if !path.exists() {
        return Ok(None);
    }
    
    let mut file = File::open(path).map_err(|e| format!("Failed to open session file: {}", e))?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read session file: {}", e))?;
    
    if contents.trim().is_empty() {
        return Ok(None);
    }
    
    let session: SessionData = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to deserialize session: {}", e))?;
    
    Ok(Some(session))
}

// Delete the session file from disk on logout
fn delete_session_from_disk(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let path = get_session_file_path(app_handle)?;
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| format!("Failed to delete session file: {}", e))?;
    }
    Ok(())
}

// --- IPC COMMANDS ---

#[tauri::command]
async fn sync_session(
    session: SessionData,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    println!("[Tauri Rust] Synchronizing session for user: {}", session.email);
    
    // Update in-memory state
    let mut guard = state.session.lock().map_err(|_| "Failed to lock session state".to_string())?;
    *guard = Some(session.clone());
    
    // Persist to disk
    save_session_to_disk(&app_handle, &session)?;
    
    // Emit event to notify other windows (Tauri v2 Emitter API)
    let _ = app_handle.emit("session-synced", &session);
    
    Ok("Session successfully synchronized and persisted".to_string())
}

#[tauri::command]
async fn get_session(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<Option<SessionData>, String> {
    // Check in-memory state first
    let mut guard = state.session.lock().map_err(|_| "Failed to lock session state".to_string())?;
    
    if guard.is_some() {
        return Ok(guard.clone());
    }
    
    // Fallback to disk if memory is empty (e.g., during app startup)
    match load_session_from_disk(&app_handle) {
        Ok(Some(session)) => {
            println!("[Tauri Rust] Restored session from disk for: {}", session.email);
            *guard = Some(session.clone());
            Ok(Some(session))
        }
        Ok(None) => Ok(None),
        Err(err) => {
            eprintln!("[Tauri Rust] Error loading session from disk: {}", err);
            Ok(None)
        }
    }
}

#[tauri::command]
async fn clear_session(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    println!("[Tauri Rust] Clearing session (User Logout)");
    
    // Clear memory
    let mut guard = state.session.lock().map_err(|_| "Failed to lock session state".to_string())?;
    *guard = None;
    
    // Clear disk
    delete_session_from_disk(&app_handle)?;
    
    // Emit clear event to all windows (Tauri v2 Emitter API)
    let _ = app_handle.emit("session-cleared", ());
    
    Ok("Session successfully cleared".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init()) // Tauri v2 notification plugin
        .manage(AppState {
            session: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            sync_session,
            get_session,
            clear_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
