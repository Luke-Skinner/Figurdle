#!/usr/bin/env python3
"""
Entry point for Google Cloud Run deployment.
This file is required for Google Cloud buildpacks to detect the startup command.
"""

import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )