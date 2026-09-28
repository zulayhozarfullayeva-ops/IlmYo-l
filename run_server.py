import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    os.chdir(DIRECTORY)
    # Try finding an open port starting from 3000
    for port in range(3000, 3010):
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                print(f"==================================================")
                print(f"IlmYo'l Platformasi muvaffaqiyatli ishga tushdi!")
                print(f"Local Server: http://localhost:{port}")
                print(f"Directory: {DIRECTORY}")
                print(f"==================================================")
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    start_server()
