import hmac
import hashlib
import time
import json
import subprocess

secret = 'garda_secret_2026_dev'

for i in range(4):
    ts = str(int(time.time()))
    payload = {
        "reportId": f"00000000-0000-0000-0000-00000000000{i+1}",
        "rawReporterInput": f"Laporan uji rate limiter ke-{i+1}",
        "category": "LAINNYA",
        "temporalContext": "SEDANG_BERLANGSUNG",
        "latitude": -6.2,
        "longitude": 106.8
    }
    payload_json = json.dumps(payload)
    sig = hmac.new(secret.encode(), f"{ts}.{payload_json}".encode(), hashlib.sha256).hexdigest()
    
    curl_cmd = f"""curl -s -w "\\nSTATUS:%{{http_code}}" -X POST http://127.0.0.1:4000/api/queue-report \
      -H "Content-Type: application/json" \
      -H "X-Garda-Timestamp: {ts}" \
      -H "X-Garda-Signature: {sig}" \
      -d '{payload_json}'"""

    res = subprocess.run(["python", "scripts/vps_exec.py", curl_cmd], capture_output=True, text=True)
    print(f"Request {i+1} output: {res.stdout.strip()}")
