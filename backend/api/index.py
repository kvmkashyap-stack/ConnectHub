import sys, os, traceback
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

# Top-level app instance required for Vercel Python runtime inspection
app = FastAPI(title="ConnectHub API")

_curr = os.path.dirname(os.path.abspath(__file__))
_parent = os.path.dirname(_curr)
_backend = os.path.join(_parent, "backend")

for _d in [_backend, _parent, _curr]:
    if os.path.exists(_d) and _d not in sys.path:
        sys.path.insert(0, _d)

try:
    import main as _main
    app = _main.app
except Exception:
    err = traceback.format_exc()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def show_error(path: str):
        return PlainTextResponse(err, status_code=500)

handler = app
application = app