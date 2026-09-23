import os
import sys
import subprocess
import mimetypes
from datetime import datetime
from flask import Flask, render_template, jsonify, send_file, send_from_directory, request, abort

# Base directory for the files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "Base de dados Ofícios")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static"
)

def format_file_size(size_bytes):
    """Format bytes to human-readable string (KB, MB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

def extract_category_and_year(filename):
    """Categorize document and extract reference year if present."""
    name_lower = filename.lower()
    
    # Year extraction
    year = None
    for y in ["2026", "2025", "2024", "2023", "2022", "2021", "2020"]:
        if y in name_lower:
            year = y
            break
            
    # Category detection
    if "ofício" in name_lower or "oficio" in name_lower:
        category = "Ofício"
    elif "anexo" in name_lower:
        category = "Anexo"
    elif "relatório" in name_lower or "relatorio" in name_lower:
        category = "Relatório"
    elif "termo" in name_lower:
        category = "Termo de Referência"
    elif "garantia" in name_lower:
        category = "Garantia"
    elif "videomonitoramento" in name_lower or "câmera" in name_lower or "camera" in name_lower:
        category = "Videomonitoramento"
    elif "iluminação" in name_lower or "iluminacao" in name_lower:
        category = "Iluminação"
    elif "resposta" in name_lower:
        category = "Resposta"
    else:
        category = "Documento"
        
    return category, year

def get_all_documents():
    """Scan the documents directory recursively and return detailed metadata."""
    documents = []
    
    if not os.path.exists(DOCS_DIR):
        return documents

    file_id = 1
    for root, _, files in os.walk(DOCS_DIR):
        for file in files:
            full_path = os.path.abspath(os.path.join(root, file))
            rel_path = os.path.relpath(full_path, DOCS_DIR).replace("\\", "/")
            
            try:
                stat = os.stat(full_path)
                size_bytes = stat.st_size
                ctime = stat.st_ctime
                mtime = stat.st_mtime
                
                # Format dates
                ctime_dt = datetime.fromtimestamp(ctime)
                mtime_dt = datetime.fromtimestamp(mtime)
                
                ext = os.path.splitext(file)[1].lower()
                category, year = extract_category_and_year(file)
                
                documents.append({
                    "id": file_id,
                    "name": file,
                    "relative_path": rel_path,
                    "full_path": full_path,
                    "size_bytes": size_bytes,
                    "size_formatted": format_file_size(size_bytes),
                    "ctime": ctime,
                    "ctime_formatted": ctime_dt.strftime("%d/%m/%Y %H:%M"),
                    "mtime": mtime,
                    "mtime_formatted": mtime_dt.strftime("%d/%m/%Y %H:%M"),
                    "extension": ext,
                    "is_pdf": ext == ".pdf",
                    "category": category,
                    "year": year
                })
                file_id += 1
            except Exception as e:
                print(f"Erro ao ler metadados do arquivo {file}: {e}", file=sys.stderr)
                
    return documents

def get_safe_file_path(relative_path):
    """Ensure relative path is safely within DOCS_DIR."""
    safe_path = os.path.abspath(os.path.join(DOCS_DIR, relative_path))
    if not safe_path.startswith(os.path.abspath(DOCS_DIR)):
        return None
    if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
        return None
    return safe_path

@app.route("/")
def index():
    """Serve the main chat-inspired application with inlined assets for cloud compatibility."""
    css_path = os.path.join(STATIC_DIR, "css", "style.css")
    js_path = os.path.join(STATIC_DIR, "js", "app.js")
    
    css_content = ""
    if os.path.exists(css_path):
        try:
            with open(css_path, "r", encoding="utf-8") as f:
                css_content = f.read()
        except Exception as e:
            print("Erro ao ler style.css:", e, file=sys.stderr)
            
    js_content = ""
    if os.path.exists(js_path):
        try:
            with open(js_path, "r", encoding="utf-8") as f:
                js_content = f.read()
        except Exception as e:
            print("Erro ao ler app.js:", e, file=sys.stderr)
            
    return render_template(
        "index.html",
        inline_css=css_content,
        inline_js=js_content
    )

@app.route("/logo/dark")
def logo_dark():
    """Serve dark theme logo."""
    path = os.path.join(STATIC_DIR, "img", "logo_barretos_inteligente_white.png")
    if os.path.exists(path):
        return send_file(path, mimetype="image/png")
    return send_file(os.path.join(BASE_DIR, "logo_barretos_inteligente.png"), mimetype="image/png")

@app.route("/logo/light")
def logo_light():
    """Serve light theme logo."""
    path = os.path.join(STATIC_DIR, "img", "logo_barretos_inteligente.png")
    if os.path.exists(path):
        return send_file(path, mimetype="image/png")
    return send_file(os.path.join(BASE_DIR, "logo_barretos_inteligente.png"), mimetype="image/png")

@app.route("/static/<path:filename>")
def serve_static(filename):
    """Serve static files directly with correct mime types for Vercel/cloud."""
    return send_from_directory(STATIC_DIR, filename)

@app.route("/api/oficios")
def api_oficios():
    """Return all documents with full metadata."""
    docs = get_all_documents()
    return jsonify({
        "success": True,
        "count": len(docs),
        "documents": docs
    })

@app.route("/api/pdf/preview/<path:subpath>")
def preview_pdf(subpath):
    """Stream file inline for browser preview."""
    safe_path = get_safe_file_path(subpath)
    if not safe_path:
        abort(404, description="Documento não encontrado.")
    
    mimetype, _ = mimetypes.guess_type(safe_path)
    if not mimetype:
        mimetype = "application/pdf" if safe_path.lower().endswith(".pdf") else "application/octet-stream"
        
    return send_file(
        safe_path,
        mimetype=mimetype,
        as_attachment=False,
        download_name=os.path.basename(safe_path)
    )

@app.route("/api/pdf/download/<path:subpath>")
def download_pdf(subpath):
    """Serve file as attachment for immediate download."""
    safe_path = get_safe_file_path(subpath)
    if not safe_path:
        abort(404, description="Documento não encontrado.")
        
    return send_file(
        safe_path,
        as_attachment=True,
        download_name=os.path.basename(safe_path)
    )

@app.route("/api/open-folder", methods=["POST"])
def open_folder():
    """Trigger Windows Explorer to select/highlight the file."""
    data = request.get_json(force=True, silent=True) or {}
    rel_path = data.get("relative_path")
    full_path = data.get("full_path")
    
    target_path = None
    if rel_path:
        target_path = get_safe_file_path(rel_path)
    elif full_path:
        abs_full = os.path.abspath(full_path)
        if abs_full.startswith(os.path.abspath(DOCS_DIR)) and os.path.isfile(abs_full):
            target_path = abs_full
            
    if not target_path or not os.path.exists(target_path):
        return jsonify({"success": False, "message": "Arquivo não encontrado."}), 404
        
    # Check if running in cloud / Vercel (no local desktop explorer available)
    if os.environ.get("VERCEL") == "1" or sys.platform != "win32":
        return jsonify({
            "success": False,
            "is_cloud": True,
            "message": "O recurso 'Ver na Pasta' só funciona localmente no computador. Na web, utilize 'Visualizar' ou 'Baixar'."
        })
        
    try:
        subprocess.Popen(["explorer.exe", f"/select,{os.path.abspath(target_path)}"])
            
        return jsonify({
            "success": True,
            "message": f"Arquivo localizado no Explorador do Windows: {os.path.basename(target_path)}"
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Erro ao abrir pasta: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Iniciando Sistema de Consulta de Ofícios em http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=True)
