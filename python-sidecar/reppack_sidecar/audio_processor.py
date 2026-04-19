import logging
from typing import Generator

from pydub import AudioSegment

logger = logging.getLogger("reppack-sidecar")


def _apply_speed(chunk: AudioSegment, speed: float) -> AudioSegment:
    if abs(speed - 1.0) < 1e-3:
        return chunk
    new_frame_rate = int(chunk.frame_rate * speed)
    altered = chunk._spawn(chunk.raw_data, overrides={"frame_rate": new_frame_rate})
    return altered.set_frame_rate(chunk.frame_rate)


def _load_audio(file_path: str) -> AudioSegment:
    suffix = file_path.rsplit(".", 1)[-1].lower()
    if suffix == "mp3":
        return AudioSegment.from_mp3(file_path)
    if suffix in ("m4a", "mp4"):
        return AudioSegment.from_file(file_path, format="mp4")
    if suffix == "wav":
        return AudioSegment.from_wav(file_path)
    if suffix == "flac":
        return AudioSegment.from_file(file_path, format="flac")
    if suffix in ("ogg", "opus"):
        return AudioSegment.from_ogg(file_path)
    return AudioSegment.from_file(file_path)


def insert_pauses(
    file_path: str,
    segments: list[dict],
    cfg: dict,
    format: str,
    bitrate_kbps: int,
    output_path: str,
) -> Generator[dict, None, None]:
    audio = _load_audio(file_path)

    yield {"status": "progress", "payload": {"percent": 5, "message": "Loaded audio"}}

    mode = cfg.get("mode", "repeat")
    speed = float(cfg.get("speed", 1.0))
    repeats = int(cfg.get("repeats", 2))
    pause_kind = cfg.get("pauseKind", "preset")
    pause_preset = float(cfg.get("pausePreset", 1.5))
    pause_ratio = float(cfg.get("pauseRatio", 1.2))

    output = AudioSegment.empty()
    total = len(segments)

    for i, seg in enumerate(segments):
        start_ms = int(seg["start"] * 1000)
        end_ms = int(seg["end"] * 1000)
        chunk = audio[start_ms:end_ms]
        seg_sec = (end_ms - start_ms) / 1000.0
        chunk = _apply_speed(chunk, speed)

        if mode == "overlap":
            output += chunk
        else:  # repeat
            output += chunk
            pause_sec = pause_preset if pause_kind == "preset" else pause_ratio * seg_sec
            silent = AudioSegment.silent(duration=int(pause_sec * 1000))
            for _ in range(repeats):
                output += silent

        percent = 5 + int(85 * (i + 1) / max(total, 1))
        yield {
            "status": "progress",
            "payload": {
                "percent": percent,
                "message": f"Processing segment {i + 1}/{total}",
            },
        }

    export_params: dict = {"format": format}
    if format in ("mp3", "m4a"):
        export_params["bitrate"] = f"{bitrate_kbps}k"

    output.export(output_path, **export_params)
    yield {"status": "progress", "payload": {"percent": 100, "message": "Export complete"}}
    yield {"status": "success", "payload": {"output_path": output_path}}
