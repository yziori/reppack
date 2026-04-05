import json
import logging
import sys

from reppack_sidecar.audio_processor import insert_pauses
from reppack_sidecar.model_manager import ensure_model
from reppack_sidecar.protocol import Request, error_response, success_response
from reppack_sidecar.transcriber import transcribe

logging.basicConfig(stream=sys.stderr, level=logging.INFO)
logger = logging.getLogger("reppack-sidecar")


def send_response(response: dict) -> None:
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()


def main() -> None:
    send_response({"id": "init", "status": "ready", "payload": {}})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            data = json.loads(line)
        except json.JSONDecodeError as e:
            send_response(error_response("unknown", str(e)))
            continue

        request = Request.from_dict(data)

        try:
            if request.action == "check_model":
                result = ensure_model(
                    request.payload.get("model_name", "large-v3-turbo")
                )
                send_response(success_response(request.id, result))

            elif request.action == "transcribe":
                for update in transcribe(
                    request.payload["file_path"],
                    request.payload.get("language"),
                ):
                    send_response({"id": request.id, **update})

            elif request.action == "insert_pauses":
                for update in insert_pauses(
                    request.payload["file_path"],
                    request.payload["segments"],
                    request.payload["pause_ms"],
                    request.payload["output_path"],
                ):
                    send_response({"id": request.id, **update})

            elif request.action == "shutdown":
                send_response(success_response(request.id, {}))
                break

            else:
                send_response(
                    error_response(
                        request.id, f"Unknown action: {request.action}"
                    )
                )

        except Exception as e:
            logger.exception("Error processing request")
            send_response(error_response(request.id, str(e)))


if __name__ == "__main__":
    main()
