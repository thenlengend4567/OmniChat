use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    if let Err(e) = window.minimize() {
        eprintln!("Failed to minimize window: {}", e);
    }
}

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if let Err(e) = window.maximize() {
        eprintln!("Failed to maximize window: {}", e);
    }
}

#[tauri::command]
fn unmaximize_window(window: tauri::Window) {
    if let Err(e) = window.unmaximize() {
        eprintln!("Failed to unmaximize window: {}", e);
    }
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::Window) {
    if let Ok(is_max) = window.is_maximized() {
        let res = if is_max {
            window.unmaximize()
        } else {
            window.maximize()
        };
        if let Err(e) = res {
            eprintln!("Failed to toggle maximize window: {}", e);
        }
    }
}

#[tauri::command]
fn is_window_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn close_window(window: tauri::Window) {
    if let Err(e) = window.close() {
        eprintln!("Failed to close window: {}", e);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Build the system tray menu items
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &quit_i])?;

            // Retrieve the default window icon configured in tauri.conf.json
            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .build(app)?;
            } else {
                eprintln!("Warning: Default window icon is missing. System tray icon could not be initialized.");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            unmaximize_window,
            toggle_maximize_window,
            is_window_maximized,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
