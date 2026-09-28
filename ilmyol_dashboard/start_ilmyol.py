"""
start_ilmyol.py — IlmYo'l Platform Launcher
=============================================
Starts both servers simultaneously:
  1. Embedding Server (port 3001) — real semantic similarity
  2. HTTP Server     (port 3000) — static files / dashboard

Usage:
    python start_ilmyol.py

Optional:
    python start_ilmyol.py --embed-model BAAI/bge-m3
"""

import subprocess, sys, os, time, argparse

BASE = os.path.dirname(os.path.abspath(__file__))
PY  = sys.executable

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--embed-model', default='paraphrase-multilingual-MiniLM-L12-v2',
                        help='Sentence-transformers model name for embedding server')
    args = parser.parse_args()

    print("=" * 56)
    print("IlmYo'l Platform - Full Stack Launcher")
    print("=" * 56)

    # Start embedding server
    embed_proc = subprocess.Popen(
        [PY, os.path.join(BASE, 'embedding_server.py'), '--model', args.embed_model],
        cwd=BASE
    )
    print(f"[Launcher] Embedding server started (PID {embed_proc.pid})")
    time.sleep(1)

    # Start HTTP server
    http_proc = subprocess.Popen(
        [PY, os.path.join(BASE, 'run_server.py')],
        cwd=BASE
    )
    print(f"[Launcher] HTTP server started (PID {http_proc.pid})")
    print()
    print("  Dashboard : http://localhost:3000")
    print("  Embed API : http://localhost:3001/api/health")
    print()
    print("  NOTE: Embedding server loads model in background.")
    print("  Dashboard works immediately; real embeddings activate once model is ready.")
    print("  Watch terminal for '[EmbedSrv] Matrix ready' message.")
    print()
    print("  Press Ctrl+C to stop all servers.")

    try:
        embed_proc.wait()
    except KeyboardInterrupt:
        print("\n[Launcher] Stopping servers...")
        embed_proc.terminate()
        http_proc.terminate()

if __name__ == '__main__':
    main()
