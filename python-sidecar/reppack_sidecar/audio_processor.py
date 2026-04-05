import logging
from typing import Generator

from pydub import AudioSegment

logger = logging.getLogger("reppack-sidecar")


def insert_pauses(
    file_path: str,
    segments: list[dict],
    pause_ms: int,
    output_path: str,
) -> Generator[dict, None, None]:
    audio = AudioSegment.from_mp3(file_path)
    silent_gap = AudioSegment.silent(duration=pause_ms)

    yield {
        "status": "progress",
        "payload": {"percent": 10, "message": "Loaded audio"},
    }

    output = AudioSegment.empty()
    total = len(segments)

    for i, seg in enumerate(segments):
        start_ms = int(seg["start"] * 1000)
        end_ms = int(seg["end"] * 1000)
        chunk = audio[start_ms:end_ms]
        output += chunk
        if i < total - 1:
            output += silent_gap

        percent = 10 + int(80 * (i + 1) / total)
        yield {
            "status": "progress",
            "payload": {
                "percent": percent,
                "message": f"Processing segment {i + 1}/{total}",
            },
        }

    output.export(output_path, format="mp3")
    yield {
        "status": "progress",
        "payload": {"percent": 100, "message": "Export complete"},
    }
    yield {
        "status": "success",
        "payload": {"output_path": output_path},
    }
