import os
import sys
import traceback

_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.join(_current_dir, "backend")

for _p in [_backend_dir, _current_dir]:
    if os.path.exists(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.main import app
except Exception as e:
    print(f"FAILED TO IMPORT BACKEND APP: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    raise

__all__ = ["app"]
