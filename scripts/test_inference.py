import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('5.22.209.52', port=22, username='tugasagama', password='tugaspai', timeout=10)

payload = {
    "model": "gemini/gemini-3.5-flash-lite",
    "messages": [
        {"role": "user", "content": "respond only with JSON: {\"status\": \"ok\"}"}
    ],
    "max_tokens": 50
}

# Send payload via python script on VPS with sk-9router-direct
cmd = '''python3 -c "
import urllib.request, json
req = urllib.request.Request(
    'http://127.0.0.1:20128/v1/chat/completions',
    data=json.dumps({'model': 'ultra-fast', 'messages': [{'role': 'user', 'content': 'ping'}]}).encode(),
    headers={'Content-Type': 'application/json', 'Authorization': 'Bearer sk-9router-direct'}
)
try:
    with urllib.request.urlopen(req, timeout=15) as res:
        print('STATUS:', res.status)
        print('BODY:', res.read().decode()[:300])
except urllib.error.HTTPError as e:
    print('HTTP ERR:', e.code, e.read().decode())
except Exception as e:
    print('ERR:', e)
"'''
stdin, stdout, stderr = client.exec_command(cmd)
res = stdout.read().decode()
err = stderr.read().decode()
print("STDOUT:", res)
print("STDERR:", err)
client.close()
