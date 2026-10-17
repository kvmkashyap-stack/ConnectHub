import os
import sys

_curr = os.path.dirname(os.path.abspath(__file__))
_parent = os.path.dirname(_curr)
_backend = os.path.join(_parent, "backend")

for _d in [_backend, _parent, _curr]:
    if os.path.exists(_d) and _d not in sys.path:
        sys.path.insert(0, _d)

import backend.main as _bm

# Strict top-level ASGI variable for Vercel
app = _bm.app
