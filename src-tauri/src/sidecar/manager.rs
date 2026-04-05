use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tokio::sync::Mutex;

use super::protocol::{SidecarRequest, SidecarResponse};

pub struct SidecarManager {
    child: Mutex<Option<CommandChild>>,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }

    pub async fn spawn(&self, app: &tauri::AppHandle) -> Result<(), String> {
        let mut guard = self.child.lock().await;
        if guard.is_some() {
            return Err("Sidecar is already running".into());
        }

        let shell = app.shell();

        // python-sidecar ディレクトリを解決
        // 開発時: プロジェクトルートの python-sidecar/
        // ビルド時: リソースディレクトリの python-sidecar/
        let resource_dir = app.path().resource_dir().ok();
        let sidecar_dir = resource_dir
            .as_ref()
            .map(|d| d.join("python-sidecar"))
            .filter(|d| d.join("reppack_sidecar").exists())
            .or_else(|| {
                std::env::current_dir()
                    .ok()
                    .map(|d| d.join("python-sidecar"))
                    .filter(|d| d.join("reppack_sidecar").exists())
            })
            .ok_or("Python sidecar directory not found")?;

        let (mut rx, child) = shell
            .command("python3")
            .args(["-m", "reppack_sidecar"])
            .current_dir(sidecar_dir)
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        *guard = Some(child);
        drop(guard);

        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let line_str = String::from_utf8_lossy(&line).to_string();
                        let line_str = line_str.trim();
                        if line_str.is_empty() {
                            continue;
                        }
                        if let Ok(response) =
                            serde_json::from_str::<SidecarResponse>(line_str)
                        {
                            app_handle.emit("sidecar-output", &response).ok();
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        let msg = String::from_utf8_lossy(&line).to_string();
                        app_handle.emit("sidecar-log", &msg).ok();
                    }
                    CommandEvent::Terminated(status) => {
                        app_handle
                            .emit("sidecar-terminated", format!("{:?}", status))
                            .ok();
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub async fn send(&self, request: &SidecarRequest) -> Result<(), String> {
        let mut guard = self.child.lock().await;
        let child = guard
            .as_mut()
            .ok_or("Sidecar is not running")?;

        let json = serde_json::to_string(request).map_err(|e| e.to_string())?;
        child
            .write((json + "\n").as_bytes())
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn kill(&self) -> Result<(), String> {
        let mut guard = self.child.lock().await;
        if let Some(child) = guard.take() {
            child.kill().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
