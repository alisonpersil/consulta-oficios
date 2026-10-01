import sys
import os

# Ensure the root directory is on the Python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app

class VercelPathMiddleware:
    """WSGI middleware to ensure correct path routing under Vercel Serverless rewrites."""
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        matched_path = environ.get("HTTP_X_MATCHED_PATH")
        if matched_path:
            clean_path = matched_path.split("?")[0]
            if clean_path and clean_path not in ("/api/index.py", "/api/index"):
                environ["PATH_INFO"] = clean_path
            elif clean_path in ("/api/index.py", "/api/index"):
                environ["PATH_INFO"] = "/"
        elif environ.get("PATH_INFO") in ("/api/index.py", "/api/index"):
            environ["PATH_INFO"] = "/"
            
        return self.wsgi_app(environ, start_response)

# Apply WSGI middleware to Flask app
app.wsgi_app = VercelPathMiddleware(app.wsgi_app)

# Vercel Serverless Function entry point
app = app

