#!/usr/bin/env python3
"""
Simple server entry point that doesn't require uvicorn to be installed.
Uses Python's built-in HTTP server with the FastAPI app.
"""

import os
import sys
from wsgiref.simple_server import make_server

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app.main import app
    print("Successfully imported FastAPI app")

    # Get port from environment
    port = int(os.environ.get("PORT", 8080))
    host = "0.0.0.0"

    # Try to use uvicorn if available
    try:
        import uvicorn
        print("Found uvicorn, using it")
        uvicorn.run(app, host=host, port=port, log_level="info")
    except ImportError:
        print("uvicorn not found, using ASGI server fallback")
        # Fallback to hypercorn or basic ASGI server
        try:
            import hypercorn.asyncio
            import asyncio
            from hypercorn import Config
            config = Config()
            config.bind = [f"{host}:{port}"]
            asyncio.run(hypercorn.asyncio.serve(app, config))
        except ImportError:
            print("No ASGI servers available. App needs uvicorn or hypercorn.")
            sys.exit(1)

except Exception as e:
    print(f"Error starting server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)