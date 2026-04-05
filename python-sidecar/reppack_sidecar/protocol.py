from dataclasses import dataclass
from typing import Any


@dataclass
class Request:
    action: str
    id: str
    payload: dict[str, Any]

    @classmethod
    def from_dict(cls, data: dict) -> "Request":
        return cls(
            action=data.get("action", ""),
            id=data.get("id", "unknown"),
            payload=data.get("payload", {}),
        )


def success_response(req_id: str, payload: dict[str, Any]) -> dict:
    return {"id": req_id, "status": "success", "payload": payload}


def error_response(req_id: str, message: str) -> dict:
    return {"id": req_id, "status": "error", "payload": {"message": message}}
