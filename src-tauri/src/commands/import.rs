use serde::Serialize;
use std::fs;
use std::path::Path;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

#[derive(Debug, Serialize)]
pub struct FileMeta {
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
    #[serde(rename = "durationSec")]
    pub duration_sec: f64,
    #[serde(rename = "sampleRateHz")]
    pub sample_rate_hz: u32,
    pub channels: u32,
}

#[derive(Debug, Serialize)]
pub struct AudioFileInfo {
    pub path: String,
    pub name: String,
    pub meta: FileMeta,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "m4a", "wav", "flac", "ogg", "opus"];

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

    if !SUPPORTED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!(
            "Unsupported format: .{}. Supported: {}",
            extension,
            SUPPORTED_EXTENSIONS.join(", ")
        ));
    }

    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let size_bytes = fs::metadata(file_path)
        .map_err(|e| format!("Failed to read file size: {e}"))?
        .len();

    let file = fs::File::open(file_path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    hint.with_extension(&extension);

    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| format!("Failed to probe audio: {e}"))?;

    let format = probed.format;
    let track = format
        .default_track()
        .ok_or_else(|| "No audio track found".to_string())?;

    let codec_params = &track.codec_params;
    let sample_rate_hz = codec_params.sample_rate.unwrap_or(0);
    let channels = codec_params
        .channels
        .map(|c| c.count() as u32)
        .unwrap_or(0);

    let duration_sec = match (codec_params.n_frames, codec_params.sample_rate) {
        (Some(frames), Some(rate)) if rate > 0 => frames as f64 / rate as f64,
        _ => 0.0,
    };

    Ok(AudioFileInfo {
        path,
        name,
        meta: FileMeta {
            size_bytes,
            duration_sec,
            sample_rate_hz,
            channels,
        },
    })
}
