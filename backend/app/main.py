# This file makes the old `python -m uvicorn app.main:app --reload` command work
# by re-exporting the app from the root main.py
import sys
import os

# Add parent directory (backend/) to path so root main.py can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: F401 — re-export for uvicorn

__all__ = ["app"]
