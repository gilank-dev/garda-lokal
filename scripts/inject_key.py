import paramiko
import os
import socket

pub_key_path = os.path.expanduser('~/.ssh/id_ed25519.pub')
with open(pub_key_path, 'r') as f:
    pub_key = f.read().strip()

print(f"Injecting key: {pub_key}")

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(20)
sock.connect(('5.22.209.52', 22))

t = paramiko.Transport(sock)
t.banner_timeout = 60
t.start_client(timeout=60)
t.auth_password('tugasagama', 'tugaspai')

if not t.is_authenticated():
    print("Auth failed!")
    sys.exit(1)

session = t.open_session()
cmd = f'mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "{pub_key}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo KEY_INJECTED_SUCCESSFULLY'
session.exec_command(cmd)

out = session.recv(1024).decode()
print("Output:", out)
t.close()
sock.close()
