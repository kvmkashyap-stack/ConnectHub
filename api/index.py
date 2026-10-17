import os
import sys

# Ensure backend directory is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
_backend_dir = os.path.join(_root_dir, "backend")

for p in [_backend_dir, _root_dir, _current_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from main import app
except Exception as e:
    import traceback
    _tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="ConnectHub Backend (Error Diagnostic)")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def _catch_all(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "status": "initialization_failed",
                "error": str(e),
                "traceback": _tb.splitlines(),
                "python_path": sys.path,
                "current_dir": os.getcwd(),
            }
        )
