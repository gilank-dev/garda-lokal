import paramiko
import socket
import time
import re
import os
import sys

VPS_HOST = '5.22.209.52'
VPS_PORT = 22
VPS_USER = 'tugasagama'
VPS_PASS = 'tugaspai'

def run_remote(cmd, timeout=30):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    sock.connect((VPS_HOST, VPS_PORT))

    t = paramiko.Transport(sock)
    t.banner_timeout = 60
    t.start_client(timeout=60)
    t.auth_password(VPS_USER, VPS_PASS)

    if not t.is_authenticated():
        raise RuntimeError("Authentication failed!")

    session = t.open_session()
    session.exec_command(cmd)

    out = b""
    err = b""
    while True:
        if session.recv_ready():
            chunk = session.recv(4096)
            if not chunk:
                break
            out += chunk
        elif session.recv_stderr_ready():
            chunk = session.recv_stderr(4096)
            if not chunk:
                break
            err += chunk
        elif session.exit_status_ready():
            break

    while session.recv_ready():
        out += session.recv(4096)
    while session.recv_stderr_ready():
        err += session.recv_stderr(4096)

    exit_code = session.recv_exit_status()
    t.close()
    sock.close()
    return exit_code, out.decode('utf-8', errors='replace'), err.decode('utf-8', errors='replace')

def setup_tunnel():
    print("==================================================================")
    print(" [GARDA-LOKAL / PAI] CLOUDFLARE TUNNEL AUTOMATED PROVISIONING")
    print("==================================================================\n")

    # Step 1: Ensure directory & download cloudflared
    print("[1/5] Checking / Installing cloudflared binary in user-space...")
    check_cmd = "test -x /home/tugasagama/bin/cloudflared && echo 'EXISTS' || echo 'MISSING'"
    _, out, _ = run_remote(check_cmd)

    if 'EXISTS' not in out:
        print("  Downloading official cloudflared Linux amd64 binary (~40MB)...")
        dl_cmd = (
            "mkdir -p /home/tugasagama/bin && "
            "curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 "
            "-o /home/tugasagama/bin/cloudflared && "
            "chmod +x /home/tugasagama/bin/cloudflared"
        )
        code, o, e = run_remote(dl_cmd, timeout=120)
        if code != 0:
            raise RuntimeError(f"Failed to download cloudflared: {e}")
        print("  [OK] cloudflared downloaded and installed to /home/tugasagama/bin/cloudflared.")
    else:
        print("  [OK] cloudflared already present in /home/tugasagama/bin/cloudflared.")

    # Step 2: Stop any existing cloudflared instance
    print("\n[2/5] Cleaning up any old tunnel sessions...")
    run_remote("pkill -f 'cloudflared tunnel' || true")
    time.sleep(1)

    # Step 3: Launch Cloudflare Tunnel daemonized via setsid
    print("\n[3/5] Starting Cloudflare Quick Tunnel forwarding to port 4000...")
    tunnel_cmd = (
        "/usr/bin/setsid /home/tugasagama/bin/cloudflared tunnel "
        "--url http://127.0.0.1:4000 --no-autoupdate "
        "> /home/tugasagama/garda-vps/tunnel.log 2>&1 < /dev/null &"
    )
    run_remote(tunnel_cmd)

    # Step 4: Extract the generated public trycloudflare.com URL
    print("\n[4/5] Extracting secure public HTTPS URL from tunnel.log...")
    public_url = None
    for attempt in range(15):
        time.sleep(2)
        _, log_out, _ = run_remote("cat /home/tugasagama/garda-vps/tunnel.log 2>/dev/null")
        match = re.search(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com', log_out)
        if match:
            public_url = match.group(0)
            break
        print(f"  Waiting for tunnel registration... ({attempt + 1}/15)")

    if not public_url:
        _, log_out, _ = run_remote("tail -n 30 /home/tugasagama/garda-vps/tunnel.log 2>/dev/null")
        print("Tunnel Log Dump:\n", log_out)
        raise RuntimeError("Failed to obtain Cloudflare Tunnel URL within timeout.")

    print(f"\n  🎉 SUCCESS! Public Tunnel URL Established: {public_url}")

    # Step 5: Test public HTTPS connectivity to worker
    print("\n[5/5] Testing public endpoint connectivity from external network...")
    health_url = f"{public_url}/health"
    print(f"  Pinging: {health_url}")
    
    # We can use python urllib from local machine
    import urllib.request
    import json
    try:
        req = urllib.request.Request(health_url, headers={'User-Agent': 'Garda-Tunnel-Verifier/1.0'})
        with urllib.request.urlopen(req, timeout=15) as res:
            res_body = res.read().decode('utf-8')
            parsed = json.loads(res_body)
            print("  Response Status:", res.status)
            print("  Health JSON:", json.dumps(parsed, indent=2))
    except Exception as exc:
        print(f"  Warning: Local curl to tunnel experienced: {exc}. Retrying via VPS curl...")
        _, vps_curl, _ = run_remote(f"curl -s {health_url}")
        print("  VPS remote check:", vps_curl)

    # Check quota after tunnel
    _, quota, _ = run_remote("du -sb /home/tugasagama && du -sh /home/tugasagama")
    print("\n[Audit] VPS Disk Quota Verification:")
    print(" ", quota.strip())

    # Update .env.local
    env_local_path = os.path.abspath("apps/web/.env.local")
    if os.path.exists(env_local_path):
        with open(env_local_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        webhook_target = f"{public_url}/api/queue-report"
        if "VPS_QUEUE_WEBHOOK_URL=" in content:
            content = re.sub(r'VPS_QUEUE_WEBHOOK_URL=.*', f'VPS_QUEUE_WEBHOOK_URL="{webhook_target}"', content)
        else:
            content += f'\nVPS_QUEUE_WEBHOOK_URL="{webhook_target}"\n'

        with open(env_local_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\n[Config] Updated apps/web/.env.local with VPS_QUEUE_WEBHOOK_URL=\"{webhook_target}\"")

    print("\n==================================================================")
    print(" CLOUDFLARE TUNNEL SETUP COMPLETED SUCCESSFULLY!")
    print(f" Public HTTPS Endpoint: {public_url}")
    print(f" Webhook API Endpoint: {public_url}/api/queue-report")
    print("==================================================================")

if __name__ == '__main__':
    setup_tunnel()
