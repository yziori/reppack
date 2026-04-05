use tauri::State;

use crate::sidecar::manager::SidecarManager;
use crate::sidecar::protocol::SidecarRequest;

#[tauri::command]
pub async fn start_sidecar(
    app: tauri::AppHandle,
    manager: State<'_, SidecarManager>,
) -> Result<(), String> {
    manager.spawn(&app).await
}

#[tauri::command]
pub async fn stop_sidecar(manager: State<'_, SidecarManager>) -> Result<(), String> {
    manager.kill().await
}

#[tauri::command]
pub async fn request_transcription(
    manager: State<'_, SidecarManager>,
    file_path: String,
    language: Option<String>,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let mut payload = serde_json::json!({ "file_path": file_path });
    if let Some(lang) = language {
        payload["language"] = serde_json::Value::String(lang);
    }

    let request = SidecarRequest {
        action: "transcribe".into(),
        id,
        payload,
    };

    manager.send(&request).await
}
