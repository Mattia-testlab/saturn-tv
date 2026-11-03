from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import subprocess,json,html,re
import argparse
parser=argparse.ArgumentParser(description='Collaudo locale con il player reale; non emula il firmware Samsung e non scarica il file video.')
args=parser.parse_args()
root=Path(__file__).resolve().parent
module=root.parent/'saturn.js'
def read_remote(url,referer=None):
 command=['curl','-fsSL','--max-time','20']
 if referer:command+=['-e',referer]
 result=subprocess.run(command+[url],capture_output=True)
 if result.returncode:raise RuntimeError('Lettura HTTP fallita: '+str(result.returncode))
 return result.stdout
page=read_remote('https://www.animesaturn.net/anime/black-clover-67Dip/ep-50').decode()
match=re.search(r'x-data="watchPage\((.*?)\)"',page)
if not match:raise RuntimeError('La struttura della pagina è cambiata.')
frame_url=json.loads(html.unescape(match.group(1)))['initialVideoUrl']
parsed=urlsplit(frame_url)
if parsed.scheme!='https' or parsed.netloc!='play.saturncdn.net':raise RuntimeError('Dominio player non previsto.')
frame_path=frame_url.removeprefix('https://play.saturncdn.net')
frame_html=read_remote(frame_url).decode()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,fmt,*args):pass
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/':
   frame='http://localhost:8768'+frame_path
   text='''<!doctype html><html lang="it"><meta charset="utf-8"><title>Saturn TV 0.9.1 · player originale</title><style>body{background:#101820;color:#eef6ff;font:20px sans-serif;margin:16px}iframe{width:calc(100vw - 32px);max-width:1000px;height:50vw;max-height:562px;border:0}button{font:inherit;padding:12px}</style><h1>Player originale del sito</h1><p>Modulo 0.9.1: barra completa, filtro e cursore. Collaudo sul Mac.</p><iframe id="watch-iframe" allow="autoplay;fullscreen" allowfullscreen src="FRAME" title="Player originale"></iframe><p><button onclick="__saturnTV.actions.main()">Navigazione</button></p><script src="/saturn-real-test.js"></script></html>'''.replace('FRAME',html.escape(frame,quote=True))
   data=text.encode();kind='text/html'
  elif path=='/saturn-real-test.js':
   source=module.read_text().replace('var host = win.location.hostname.toLowerCase();',"var host = win.location.hostname.toLowerCase(); if(host==='127.0.0.1')host='www.animesaturn.net';else if(host==='localhost')host='play.saturncdn.net';")
   source=source.replace("'https://play.saturncdn.net'","'http://localhost:8768'").replace("'https://www.animesaturn.net'","'http://127.0.0.1:8768'")
   data=source.encode();kind='text/javascript'
  elif self.path==frame_path:
   source=frame_html
   # Keep the real provider and source pipeline; omit only the unrelated ad loader from this isolated test.
   source=re.sub(r'<script[^>]+src=[\"\'][^\"\']*acscdn.com[^\"\']*[\"\'][^>]*>.*?</script>','',source,flags=re.S)
   source=source.replace('<head>','<head><script src="/saturn-real-test.js"></script>',1)
   data=source.encode();kind='text/html'
  elif path.startswith('/assets/') or (path.startswith('/embed/') and path.endswith('/playlist')):
   result=subprocess.run(['curl','-fsSL','--max-time','20','-e',frame_url,'https://play.saturncdn.net'+self.path],capture_output=True)
   print('Asset',path,'curl='+str(result.returncode),'bytes='+str(len(result.stdout)),flush=True)
   if result.returncode:self.send_error(502);return
   data=result.stdout;kind='text/javascript' if path.endswith('.js') else 'text/css' if path.endswith('.css') else 'application/json' if path.endswith('/playlist') else 'application/octet-stream'
  else:self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',kind+'; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
print('Real player test: http://127.0.0.1:8768/',flush=True)
ThreadingHTTPServer(('127.0.0.1',8768),Handler).serve_forever()
