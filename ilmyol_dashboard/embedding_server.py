"""
IlmYo'l Semantic Embedding Server — embedding_server.py
=========================================================
Provides REAL multilingual semantic similarity for Topic Novelty Engine v1.1.

Model options:
  DEFAULT: paraphrase-multilingual-MiniLM-L12-v2  (~278 MB, 50+ languages, FAST)
  OPTION:  BAAI/bge-m3                             (~570 MB, 100+ languages, higher quality)
  OPTION:  intfloat/multilingual-e5-base           (~1.1 GB, best quality, heaviest)

Why paraphrase-multilingual-MiniLM-L12-v2 as default (not bge-m3):
  - 278 MB vs 570 MB — practical for local dev startup
  - Supports Uzbek Latin + Cyrillic (via multilingual tokenizer)
  - 3s startup vs 10s+ for bge-m3
  - To use bge-m3: python embedding_server.py --model BAAI/bge-m3

API:
  GET  /api/health           -> {status, model, corpus_size, ready}
  GET  /api/matrix           -> {matrix: {ILMYOL-001: {ILMYOL-002: 99.8, ...}}}
  POST /api/query_similarity -> {query: "..."} -> {similarities: {ILMYOL-001: 82.3, ...}}
"""

import sys, os, json, re, time, argparse, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import TCPServer

DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"
EMBED_PORT    = 3001
DATA_JS_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.js")

model             = None
corpus_topics     = []
corpus_embeddings = None
similarity_matrix = {}
server_ready      = False
model_name_used   = ""

CYRILLIC_MAP = {
    'a':'a','b':'b','v':'v','g':'g','d':'d','e':'e','j':'j','z':'z',
    'i':'i','y':'y','k':'k','l':'l','m':'m','n':'n','o':'o','p':'p',
    'r':'r','s':'s','t':'t','u':'u','f':'f',
    '\u0430':'a','\u0431':'b','\u0432':'v','\u0433':'g','\u0434':'d','\u0435':'e',
    '\u0436':'j','\u0437':'z','\u0438':'i','\u0439':'y','\u043a':'k',
    '\u043b':'l','\u043c':'m','\u043d':'n','\u043e':'o','\u043f':'p',
    '\u0440':'r','\u0441':'s','\u0442':'t','\u0443':'u','\u0444':'f',
    '\u0445':'x','\u0447':'ch','\u0448':'sh','\u049b':'q','\u0493':'g',
    '\u04b3':'h','\u045e':'o','\u0451':'yo','\u044e':'yu','\u044f':'ya',
    '\u0449':'sh','\u0446':'ts','\u044a':'','\u044b':'i','\u044c':'','\u044d':'e'
}

def normalize_exact(text):
    if not text: return ""
    t = ''.join(CYRILLIC_MAP.get(c, c) for c in text.lower())
    t = re.sub(r"[''`\u00b4\u2018\u2019\u02bc]", "'", t)
    t = re.sub(r"[.,;:!?()\[\]{}'\"«»\u2014\u2013\-/\\\s]+", " ", t).strip()
    return t

def load_corpus():
    global corpus_topics
    with open(DATA_JS_PATH, encoding='utf-8') as f:
        content = f.read()
    blocks = re.findall(r'\{[^{}]*corpus_id[^{}]*\}', content, re.DOTALL)
    seen, topics = set(), []
    for block in blocks:
        cid   = re.search(r'corpus_id:\s*["\']([^"\']+)["\']', block)
        title = re.search(r'title_normalized_latin:\s*"([^"]+)"', block)
        code  = re.search(r'specialty_code:\s*["\']([^"\']+)["\']', block)
        if cid and title and cid.group(1) not in seen:
            seen.add(cid.group(1))
            topics.append({
                'corpus_id':      cid.group(1),
                'title':          title.group(1),
                'specialty_code': code.group(1) if code else '10.00.09'
            })
    corpus_topics = topics
    print(f"[EmbedSrv] Corpus: {len(corpus_topics)} topics loaded", flush=True)

def init_engine(model_name):
    global model, corpus_embeddings, similarity_matrix, server_ready, model_name_used
    print(f"[EmbedSrv] Loading model: {model_name}", flush=True)
    try:
        import numpy as np
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        model_name_used = model_name
        print(f"[EmbedSrv] Model ready.", flush=True)

        titles = [t['title'] for t in corpus_topics]
        print(f"[EmbedSrv] Encoding {len(titles)} corpus topics...", flush=True)
        corpus_embeddings = model.encode(titles, batch_size=8,
                                          show_progress_bar=True,
                                          normalize_embeddings=True)

        scores = np.dot(corpus_embeddings, corpus_embeddings.T)
        for i, ta in enumerate(corpus_topics):
            similarity_matrix[ta['corpus_id']] = {}
            for j, tb in enumerate(corpus_topics):
                if i == j:
                    similarity_matrix[ta['corpus_id']][tb['corpus_id']] = 100.0
                elif normalize_exact(ta['title']) == normalize_exact(tb['title']):
                    similarity_matrix[ta['corpus_id']][tb['corpus_id']] = 100.0
                else:
                    cos = float(scores[i, j])
                    similarity_matrix[ta['corpus_id']][tb['corpus_id']] = max(0.0, min(100.0, round(cos * 100.0, 1)))

        server_ready = True
        print(f"[EmbedSrv] Matrix ready. Server is LIVE at http://localhost:{EMBED_PORT}", flush=True)
    except ImportError:
        print("[EmbedSrv] ERROR: Run: pip install sentence-transformers", flush=True)
    except Exception as e:
        print(f"[EmbedSrv] ERROR: {e}", flush=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.cors_headers()
        self.end_headers()

    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/api/health':
            self.send_json({'status': 'ok' if server_ready else 'loading',
                            'ready': server_ready,
                            'model': model_name_used or 'loading',
                            'corpus_size': len(corpus_topics)})
        elif p == '/api/matrix':
            if not server_ready:
                self.send_json({'error': 'Not ready', 'ready': False}, 503)
            else:
                self.send_json({'ready': True, 'model': model_name_used,
                                'corpus_size': len(corpus_topics),
                                'matrix': similarity_matrix})
        else:
            self.send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        p = self.path.split('?')[0]
        if p == '/api/query_similarity':
            if not server_ready:
                self.send_json({'error': 'Not ready', 'ready': False}, 503)
                return
            length = int(self.headers.get('Content-Length', 0))
            try:
                body = json.loads(self.rfile.read(length).decode('utf-8'))
            except Exception:
                self.send_json({'error': 'Bad JSON'}, 400)
                return
            query = body.get('query', '').strip()
            if not query:
                self.send_json({'error': 'query required'}, 400)
                return
            try:
                import numpy as np
                q_emb = model.encode([query], normalize_embeddings=True)[0]
                q_norm = normalize_exact(query)
                sims = {}
                for i, t in enumerate(corpus_topics):
                    if q_norm == normalize_exact(t['title']):
                        sims[t['corpus_id']] = 100.0
                    else:
                        cos = float(np.dot(q_emb, corpus_embeddings[i]))
                        sims[t['corpus_id']] = max(0.0, min(100.0, round(cos * 100.0, 1)))
                self.send_json({'ready': True, 'similarities': sims, 'model': model_name_used})
            except Exception as e:
                self.send_json({'error': str(e)}, 500)
        else:
            self.send_json({'error': 'Not found'}, 404)

def main():
    global EMBED_PORT
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default=DEFAULT_MODEL)
    parser.add_argument('--port', type=int, default=EMBED_PORT)
    args = parser.parse_args()
    EMBED_PORT = args.port

    print("=" * 55, flush=True)
    print("IlmYo'l Semantic Embedding Server v1.1", flush=True)
    print(f"  Port  : {args.port}", flush=True)
    print(f"  Model : {args.model}", flush=True)
    print("=" * 55, flush=True)

    load_corpus()
    t = threading.Thread(target=init_engine, args=(args.model,), daemon=True)
    t.start()

    TCPServer.allow_reuse_address = True
    with TCPServer(("", args.port), Handler) as httpd:
        print(f"[EmbedSrv] Listening: http://localhost:{args.port}", flush=True)
        httpd.serve_forever()

if __name__ == "__main__":
    main()
