// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod modules;

fn main() {
    modules::register_modules(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
