import logging
from typing import Generator

logger = logging.getLogger("reppack-sidecar")

_model = None


def get_model(model_size: str = "large-v3-turbo"):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        logger.info("Loading model: %s", model_size)
        _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        logger.info("Model loaded successfully")
    return _model


def transcribe(
    file_path: str, language: str | None = None
) -> Generator[dict, None, None]:
    model = get_model()
    segments, info = model.transcribe(file_path, language=language, beam_size=5)

    result_segments = []
    for i, segment in enumerate(segments):
        result_segments.append(
            {
                "id": i,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
            }
        )
        yield {
            "status": "progress",
            "payload": {
                "segments_so_far": len(result_segments),
                "latest_text": segment.text.strip(),
            },
        }

    yield {
        "status": "success",
        "payload": {
            "segments": result_segments,
            "language": info.language,
            "duration": info.duration,
        },
    }
