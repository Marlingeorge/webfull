import os
import sys

# Ensure the backend package root is on sys.path so tests can import `app` when
# pytest is invoked from the repository root or other working directories.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
