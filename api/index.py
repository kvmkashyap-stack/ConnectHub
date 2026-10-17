import os
import sys
from fastapi import FastAPI

# Immediate top-level FastAPI instance guaranteed for Vercel AST inspection
app = FastAPI(title="ConnectHub API")

_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
_backend_dir = os.path.join(_root_dir, "backend")

for _p in [_backend_dir, _root_dir, _current_dir]:
    if os.path.exists(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

try:
    import main as _main
    app = _main.app
except Exception as _err:
    import traceback
    _tb = traceback.format_exc()
    from fastapi.responses import JSONResponse

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def _catch_all(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "status": "initialization_failed",
                "error": str(_err),
                "traceback": _tb.splitlines(),
                "python_path": sys.path,
                "current_dir": os.getcwd(),
            }
        )

# Top-level ASGI entrypoints for Vercel
handler = app
application = app
