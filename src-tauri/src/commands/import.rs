use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct AudioFileInfo {
    pub path: String,
    pub name: String,
}

#[tauri::command]
pub async fn import_audio(path: String) -> Result<AudioFileInfo, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File not found".into());
    }

    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if extension != "mp3" {
        return Err("Only MP3 files are supported".into());
    }

    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(AudioFileInfo { path, name })
}
