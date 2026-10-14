import hmac
import hashlib
import time
import json
import subprocess

timestamp = str(int(time.time()))
secret = 'garda_secret_2026_dev'

payload = {
    "reportId": "00000000-0000-0000-0000-000000000001",
    "rawReporterInput": "Lapor ada gerombolan anak bawa sajam celurit dan petasan kumpul di deket flyover ciputat arah lebak bulus, indikasi mau tumpah / cod tawuran malam ini.",
    "category": "BENTROK",
    "temporalContext": "RENCANA_MENDATANG",
    "latitude": -6.312345,
    "longitude": 106.754321
}

payload_json = json.dumps(payload)
to_sign = f"{timestamp}.{payload_json}"
signature = hmac.new(secret.encode(), to_sign.encode(), hashlib.sha256).hexdigest()

curl_cmd = f"""curl -s -X POST http://127.0.0.1:4000/api/queue-report \
  -H "Content-Type: application/json" \
  -H "X-Garda-Timestamp: {timestamp}" \
  -H "X-Garda-Signature: {signature}" \
  -d '{payload_json}'"""

print("Executing test webhook on VPS...")
res = subprocess.run(["python", "scripts/vps_exec.py", curl_cmd], capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
