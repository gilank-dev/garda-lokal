# VPS 1GB RAM / 3GB STORAGE BARE-METAL RUNBOOK
**Project Name:** GARDA-LOKAL
**Target Hardware:** 1 vCPU, 1 GB RAM, 3 GB Disk (Debian 12 / Ubuntu Minimal)
**Constraint Rule:** DILARANG menggunakan Docker. Gunakan ZRAM + Bun + 9Router + Tmux + Systemd + Cloudflare Tunnel.

---

## 1. ANGGARAN PENYIMPANAN & MEMORI (STORAGE & RAM BUDGET)
- **OS Linux Minimal:** ~1.1 GB Disk | ~110 MB RAM
- **Bun Runtime + Dependencies:** ~95 MB Disk | ~35 MB RAM
- **9Router Global Binary:** ~140 MB Disk | ~80 MB RAM
- **Cloudflared Binary:** ~35 MB Disk | ~25 MB RAM
- **Total Terpakai:** **~1.37 GB Disk** (Sisa >1.6 GB Bebas) | **~250 MB RAM** (Sisa >750 MB Bebas + 512 MB ZRAM).

---

## 2. AUTOMATED PROVISIONING SCRIPT (`setup-vps.sh`)

> **Instruksi untuk AI Agent:** Jalankan skrip ini di VPS untuk menyiapkan seluruh fondasi server secara otomatis dan menjaga disk 3 GB tetap bersih.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[1/7] Mengoptimalkan batas log sistem agar disk 3GB tidak penuh..."
sudo sed -i 's/#SystemMaxUse=/SystemMaxUse=20M/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=10M

echo "[2/7] Memasang ZRAM (Kompresi RAM tanpa memakan disk 3GB) dan Tmux..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends zram-tools tmux curl unzip ca-certificates
echo -e "ALGO=lz4\nPERCENT=50" | sudo tee /etc/default/zramswap
sudo systemctl restart zramswap

echo "[3/7] Memasang Node.js ringan (untuk 9Router) dan Bun Runtime..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y --no-install-recommends nodejs
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "[4/7] Memasang 9Router secara global dan membersihkan seluruh cache..."
sudo npm install -g 9router --omit=dev
sudo npm cache clean --force
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/* /tmp/*

echo "[5/7] Menyiapkan konfigurasi Tmux hemat memori (~/.tmux.conf)..."
cat << 'EOF' > ~/.tmux.conf
set -g history-limit 300
set -g mouse on
set -g status-bg black
set -g status-fg green
set -g status-left "[GARDA-CORE] "
set -g status-right "RAM: #(free -m | awk '/Mem:/ {printf \"%d/%dMB\", $3, $2}') | DISK: #(df -h / | awk 'NR==2 {print $4}') free"
EOF

echo "[6/7] Menyiapkan direktori kerja /opt/garda-vps..."
sudo mkdir -p /opt/garda-vps
sudo chown -R $USER:$USER /opt/garda-vps

echo "[7/7] Memasang Systemd Service untuk Sesi Tmux Abadi (Immortal Session)..."
sudo tee /etc/systemd/system/garda-core.service > /dev/null << EOF
[Unit]
Description=Garda-Lokal Immortal Tmux Session (9Router + Bun Queue Worker)
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
User=$USER
WorkingDirectory=/opt/garda-vps
Environment="PATH=/home/$USER/.bun/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/bin/bash -c '/usr/bin/tmux new-session -d -s garda -n engine "9router --port 20128" && /usr/bin/tmux split-window -h -t garda:engine "/home/$USER/.bun/bin/bun run --smol index.ts"'
ExecStop=/usr/bin/tmux kill-session -t garda
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "Setup VPS selesai. Siap menjalankan aplikasi di /opt/garda-vps."
```

---

## 3. PANDUAN OPERASIONAL HARIAN (TMUX & 9ROUTER)
1. **Mengatur Provider AI di 9Router (Sekali Saja di Awal):**
   - Dari laptop lokal, buka SSH Tunnel ke VPS:
     `ssh -L 20128:127.0.0.1:20128 user@ip-vps`
   - Buka `http://localhost:20128` di browser laptop, masukkan API Key provider (Groq, Gemini, OpenRouter, dll), dan buat Combo bernama **`garda-intel-combo`**.
2. **Memantau Proses di VPS:**
   - Masuk ke sesi `tmux` yang sedang berjalan: `tmux attach -t garda`
   - Keluar dari `tmux` tanpa mematikan sistem: Tekan `Ctrl+B` lalu tekan `D`.
3. **Menghubungkan VPS ke Vercel dengan Cloudflare Tunnel Gratis:**
   - Jalankan `cloudflared tunnel --url http://127.0.0.1:4000` (atau gunakan *Named Tunnel* pada domain Cloudflare gratis Anda) dan masukkan URL HTTPS-nya ke variabel `VPS_QUEUE_WEBHOOK_URL` di Vercel.