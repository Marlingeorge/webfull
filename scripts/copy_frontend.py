"""
Copy built frontend (dist) into backend/frontend/dist for serving by FastAPI.
Usage:
  python scripts/copy_frontend.py --source ../web/frontend/dist --dest ./backend/frontend/dist
If source is omitted, common locations are tried.
"""
import argparse
from pathlib import Path
import shutil
import sys

COMMONS = [
    Path("web/frontend/dist"),
    Path("web/frontend/build"),
    Path("web/dist"),
    Path("frontend/dist"),
]

parser = argparse.ArgumentParser()
parser.add_argument("--source", help="Source build dir (dist)")
parser.add_argument("--dest", default="backend/frontend/dist", help="Destination dir")
args = parser.parse_args()

if args.source:
    src = Path(args.source)
else:
    src = None
    for p in COMMONS:
        if p.exists() and p.is_dir():
            src = p
            break

if src is None or not src.exists():
    print("No frontend build directory found. Provide --source or build the frontend first.")
    sys.exit(2)

dest = Path(args.dest)
if dest.exists():
    print(f"Removing existing destination: {dest}")
    shutil.rmtree(dest)

print(f"Copying {src} -> {dest}")
shutil.copytree(src, dest)
print("Done.")
