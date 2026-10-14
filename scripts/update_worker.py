import socket, paramiko, os

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(30)
sock.connect(('5.22.209.52', 22))

t = paramiko.Transport(sock)
t.start_client(timeout=60)
t.auth_password('tugasagama', 'tugaspai')

sftp = paramiko.SFTPClient.from_transport(t)
sftp.put(os.path.abspath('vps-worker/index.mjs'), '/home/tugasagama/garda-vps/index.mjs')
sftp.close()

from vps_exec import run_remote
code, out, err = run_remote('pkill -9 -f "index.mjs" || true; sleep 1; cd /home/tugasagama/garda-vps && setsid /usr/bin/node index.mjs </dev/null >worker.log 2>&1 & sleep 2; ps aux | grep "node index.mjs" | grep -v grep; curl -s http://127.0.0.1:4000/health')
print("STDOUT:\n", out)
if err: print("STDERR:\n", err)
t.close()
sock.close()
