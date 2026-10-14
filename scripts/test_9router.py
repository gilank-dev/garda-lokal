import sys
from vps_exec import run_remote
import base64

remote_code = """
import subprocess

js = '''
fetch("http://127.0.0.1:20128/", { signal: AbortSignal.timeout(3000) })
  .then(r => console.log("ROOT STATUS:", r.status))
  .catch(e => console.log("ERR:", e.message));
'''
with open("/tmp/test_fetch.mjs", "w") as f:
    f.write(js)

p = subprocess.run("node /tmp/test_fetch.mjs", shell=True, capture_output=True, text=True)
print("STDOUT:", p.stdout)
print("STDERR:", p.stderr)
"""

b64 = base64.b64encode(remote_code.encode()).decode()
cmd = f"python3 -c \"import base64; exec(base64.b64decode('{b64}'))\""
code, o, e = run_remote(cmd)
sys.stdout.buffer.write(b"OUT:\n" + o.encode('utf-8', errors='replace') + b"\n")
sys.stderr.buffer.write(b"ERR:\n" + e.encode('utf-8', errors='replace') + b"\n")
