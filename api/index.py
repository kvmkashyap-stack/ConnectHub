import os
import sys

# Ensure backend directory is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_current_dir)
_backend_dir = os.path.join(_root_dir, "backend")

for _p in [_backend_dir, _root_dir, _current_dir]:
    if os.path.exists(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

import main

# Top-level ASGI entrypoints for Vercel Python runtime
app = main.app
handler = app
application = app
