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

# Send payload via python script on VPS or stdin
stdin, stdout, stderr = client.exec_command('python3 -c "import urllib.request, json; req = urllib.request.Request(\'http://127.0.0.1:20128/v1/chat/completions\', data=json.dumps({\'model\': \'gemini/gemini-3.5-flash-lite\', \'messages\': [{\'role\': \'user\', \'content\': \'respond with JSON: {\\\"status\\\": \\\"ok\\\"}\'}]}).encode(), headers={\'Content-Type\': \'application/json\'}); res = urllib.request.urlopen(req); print(res.read().decode())"')
res = stdout.read().decode()
err = stderr.read().decode()
print("STDOUT:", res)
print("STDERR:", err)
client.close()
