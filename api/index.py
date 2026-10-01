import sys
import os
import urllib.parse

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
        query_string = environ.get("QUERY_STRING", "")
        if "__path__" in query_string:
            qs = urllib.parse.parse_qs(query_string, keep_blank_values=True)
            if "__path__" in qs:
                raw_path = qs["__path__"][0]
                clean = "/" + raw_path.lstrip("/")
                del qs["__path__"]
                environ["QUERY_STRING"] = urllib.parse.urlencode([(k, v) for k, vals in qs.items() for v in vals])
                if clean in ("/api/index.py", "/api/index", "//"):
                    environ["PATH_INFO"] = "/"
                else:
                    environ["PATH_INFO"] = clean
                return self.wsgi_app(environ, start_response)

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
