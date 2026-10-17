import os
import sys

_curr = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_curr)

if _backend not in sys.path:
    sys.path.insert(0, _backend)

import main as _m

app = _m.app