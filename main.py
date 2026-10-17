import os
import sys

# Ensure backend directory is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.join(_current_dir, "backend")

for _p in [_backend_dir, _current_dir]:
    if os.path.exists(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

from backend.main import app

# Expose app for uvicorn
__all__ = ["app"]
