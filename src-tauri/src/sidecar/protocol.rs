use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct SidecarRequest {
    pub action: String,
    pub id: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SidecarResponse {
    pub id: String,
    pub status: String,
    pub payload: serde_json::Value,
}
