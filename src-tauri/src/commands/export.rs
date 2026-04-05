use tauri::State;

use crate::sidecar::manager::SidecarManager;
use crate::sidecar::protocol::SidecarRequest;

#[tauri::command]
pub async fn request_export(
    manager: State<'_, SidecarManager>,
    file_path: String,
    segments: serde_json::Value,
    pause_ms: u32,
    output_path: String,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let request = SidecarRequest {
        action: "insert_pauses".into(),
        id,
        payload: serde_json::json!({
            "file_path": file_path,
            "segments": segments,
            "pause_ms": pause_ms,
            "output_path": output_path,
        }),
    };

    manager.send(&request).await
}
