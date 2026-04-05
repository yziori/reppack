import logging

logger = logging.getLogger("reppack-sidecar")


def ensure_model(model_name: str = "large-v3-turbo") -> dict:
    repo_id = f"Systran/faster-whisper-{model_name}"

    try:
        from huggingface_hub import scan_cache_dir

        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            if repo.repo_id == repo_id:
                size_mb = repo.size_on_disk / (1024 * 1024)
                return {
                    "downloaded": True,
                    "size_mb": round(size_mb, 1),
                    "model_name": model_name,
                }
    except Exception:
        logger.debug("Could not scan cache for model %s", model_name)

    return {"downloaded": False, "model_name": model_name}
