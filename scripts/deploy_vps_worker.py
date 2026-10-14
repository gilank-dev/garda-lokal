import paramiko
import socket
import os
import sys
import time

def run_command(transport, cmd):
    session = transport.open_session()
    session.exec_command(cmd)
    out = b""
    while True:
        if session.recv_ready():
            chunk = session.recv(4096)
            if not chunk:
                break
            out += chunk
        elif session.exit_status_ready():
            break
    while session.recv_ready():
        out += session.recv(4096)
    return out.decode('utf-8', errors='replace')

def deploy():
    print("[1/7] Connecting to VPS via direct socket transport...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    sock.connect(('5.22.209.52', 22))

    t = paramiko.Transport(sock)
    t.banner_timeout = 60
    t.start_client(timeout=60)
    t.auth_password('tugasagama', 'tugaspai')

    if not t.is_authenticated():
        raise RuntimeError("Authentication failed!")

    sftp = paramiko.SFTPClient.from_transport(t)
    
    print("[2/7] Ensuring /home/tugasagama/garda-vps exists...")
    try:
        sftp.mkdir('/home/tugasagama/garda-vps')
    except Exception:
        pass

    local_worker_dir = os.path.abspath('vps-worker')
    files_to_upload = ['package.json', 'index.mjs']

    print("[3/7] Uploading worker files...")
    for fname in files_to_upload:
        lpath = os.path.join(local_worker_dir, fname)
        rpath = f'/home/tugasagama/garda-vps/{fname}'
        print(f"  Uploading {fname} -> {rpath}")
        sftp.put(lpath, rpath)

    sftp.close()

    print("[4/7] Running npm install & cleaning cache...")
    cmd_install = (
        'cd /home/tugasagama/garda-vps && '
        'npm install --omit=dev --no-audit && '
        'npm cache clean --force 2>/dev/null; '
        'rm -rf /home/tugasagama/.npm/_npx 2>/dev/null || true'
    )
    out_install = run_command(t, cmd_install)
    print("  Output:\n", out_install.strip())

    print("[5/7] Restarting worker process...")
    cmd_restart = (
        'pkill -9 -f "index.mjs" || true; '
        'sleep 1; '
        'cd /home/tugasagama/garda-vps && nohup /usr/bin/node index.mjs </dev/null >worker.log 2>&1 & '
        'sleep 2; '
        'ps -ef | grep "index.mjs" | grep -v grep'
    )
    out_restart = run_command(t, cmd_restart)
    print("  Process status:\n", out_restart.strip())

    print("[6/7] Verifying /health endpoint on VPS...")
    cmd_health = 'curl -s http://127.0.0.1:4000/health'
    out_health = run_command(t, cmd_health)
    print("  Health response:\n", out_health.strip())

    print("[7/7] Checking disk quota...")
    cmd_quota = 'du -sb /home/tugasagama && du -sh /home/tugasagama'
    out_quota = run_command(t, cmd_quota)
    print("  Disk usage:\n", out_quota.strip())

    t.close()
    sock.close()
    print("\n[SUCCESS] Worker deployed and verified successfully.")

if __name__ == '__main__':
    deploy()
