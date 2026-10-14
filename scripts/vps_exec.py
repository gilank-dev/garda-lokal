import paramiko
import socket
import sys

def run_remote(cmd):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    sock.connect(('5.22.209.52', 22))

    t = paramiko.Transport(sock)
    t.banner_timeout = 60
    t.start_client(timeout=60)
    t.auth_password('tugasagama', 'tugaspai')

    if not t.is_authenticated():
        raise RuntimeError("Authentication failed!")

    session = t.open_session()
    session.set_combine_stderr(False)
    session.exec_command(cmd)

    import time
    start_time = time.time()
    out = b""
    err = b""
    while time.time() - start_time < 20:
        got_data = False
        if session.recv_ready():
            chunk = session.recv(4096)
            if chunk:
                out += chunk
                got_data = True
        if session.recv_stderr_ready():
            chunk = session.recv_stderr(4096)
            if chunk:
                err += chunk
                got_data = True
        if session.exit_status_ready():
            break
        if not got_data:
            time.sleep(0.05)

    # Read remainder
    while session.recv_ready():
        out += session.recv(4096)
    while session.recv_stderr_ready():
        err += session.recv_stderr(4096)

    exit_code = session.recv_exit_status() if session.exit_status_ready() else 0
    t.close()
    sock.close()
    return exit_code, out.decode('utf-8', errors='replace'), err.decode('utf-8', errors='replace')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python vps_exec.py <cmd>")
        sys.exit(1)
    cmd = sys.argv[1]
    code, o, e = run_remote(cmd)
    if o:
        sys.stdout.buffer.write(o.encode('utf-8', errors='replace'))
    if e:
        sys.stderr.buffer.write(e.encode('utf-8', errors='replace'))
    sys.exit(code)
