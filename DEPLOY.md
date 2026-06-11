# Deployment Guide — AWS Lightsail (Ubuntu 24.04)

## Instance Details
- **Provider:** AWS Lightsail
- **OS:** Ubuntu 24.04
- **Plan:** 1 GB RAM, 2 vCPUs, 40 GB SSD
- **Region:** Mumbai (ap-south-1a)
- **Repo location on server:** `~/src/app`

> **Note:** Always use a Static IP (see Step 0) so your IP does not change on reboot.

---

## Step 0 — Create and attach a Static IP (do this first)

A static IP never changes even after reboots.

1. Go to [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com)
2. Click **Networking** (top menu) → **Create static IP**
3. Select your instance region → attach it to your instance (**Dnyansetu**)
4. Note down the static IP — use it everywhere below instead of the dynamic IP

---

## Step 1 — Add swap memory (prevents OOM crash during build)

The instance has only 1 GB RAM. Without swap, it crashes during `docker compose build`.
Run this **before** building:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify:
```bash
free -h
# Swap row should show 2.0Gi
```

---

## Step 2 — Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
```

Verify:
```bash
docker --version
docker compose version
```

---

## Step 3 — Clone the repo

```bash
mkdir -p ~/src && cd ~/src
git clone <your-repo-url> app
cd app
```

---

## Step 4 — Create .env file

Replace `YOUR_PUBLIC_IP` with your static IP from Step 0.

```bash
cat > .env << 'EOF'
VITE_API_URL=http://YOUR_PUBLIC_IP:5000/api
CORS_ORIGIN=http://YOUR_PUBLIC_IP
EOF
```

---

## Step 5 — Build and start all containers

```bash
docker compose up -d --build
```

> Takes 5–10 minutes on first run. All 3 containers (postgres, backend, frontend) must show `Up` at the end.

---

## Step 6 — Run database migrations

```bash
docker compose exec backend npx prisma migrate deploy
```

---

## Step 7 — Seed initial data

```bash
docker compose exec backend npm run seed
```

This creates the default superadmin account and initial courses:

| Field    | Value                  |
|----------|------------------------|
| Email    | superadmin@test.com    |
| Password | Test@123               |

> Change this password after first login.

---

## Step 8 — Open firewall ports in Lightsail console

1. Go to Lightsail → Your instance → **Networking** tab
2. Scroll to **IPv4 Firewall** → click **+ Add rule**

### Port 80 (Frontend)
| Field | Value |
|-------|-------|
| Application | Custom |
| Protocol | TCP |
| Port or range | 80 |
| Source IP address | **Any IPv4 address** |

Click **Create**.

### Port 5000 (Backend API)
| Field | Value |
|-------|-------|
| Application | Custom |
| Protocol | TCP |
| Port or range | 5000 |
| Source IP address | **Any IPv4 address** |

Click **Create**.

> **Important:** Always select **"Any IPv4 address"** — do NOT use "Custom IPv4 address" or the app will not be publicly accessible.

---

## Verify everything is running

```bash
docker compose ps
```

Expected output — all 3 containers `Up`:
```
NAME               IMAGE           STATUS
app-backend-1      app-backend     Up
app-frontend-1     app-frontend    Up
app-postgres-1     postgres:16     Up
```

Also verify nginx responds locally:
```bash
curl http://localhost
# Should return HTML
```

---

## Access the app

Replace `YOUR_PUBLIC_IP` with your static IP.

| Service  | URL |
|----------|-----|
| Frontend | http://YOUR_PUBLIC_IP |
| API      | http://YOUR_PUBLIC_IP:5000/api |

---

## Useful commands

```bash
# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Check container status
docker compose ps

# Restart all containers
docker compose restart

# Stop all containers
docker compose down

# Rebuild and restart after code changes
git pull
docker compose up -d --build

# Connect to database directly
docker compose exec postgres psql -U postgres -d test
```

---

## Redeployment (after code changes)

Use this every time you push new code and want to update the live server.

### Step 1 — Pull latest code
```bash
cd ~/src/app
git pull
```

### Step 2 — Rebuild and restart containers
```bash
docker compose up -d --build
```

> Only the changed services get rebuilt. The database volume is preserved — no data is lost.

### Step 3 — Run migrations (only if you added new migrations)
```bash
docker compose exec backend npx prisma migrate deploy
```

### Step 4 — Verify
```bash
docker compose ps
# All 3 containers should show Up
```

---

### Full redeployment from scratch (wipes all data)

Only use this if you want to completely reset the server.

```bash
cd ~/src/app
docker compose down -v        # stops containers and deletes volumes (DATABASE WIPED)
git pull
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx src/database/seeders/seed.ts
```

---

## Troubleshooting

### Instance crashes / becomes unresponsive during build
**Cause:** Out of memory (1 GB RAM not enough for npm install).
**Fix:** Add swap (Step 1) then retry:
```bash
docker compose up -d --build
```

---

### Backend keeps restarting — P1000 Authentication failed
**Cause:** `DATABASE_URL` in `docker-compose.yml` has wrong credentials or spaces.

Check logs:
```bash
docker compose logs backend --tail=50
```

Fix — the `@` in the password must be URL-encoded as `%40`, no spaces:
```yaml
DATABASE_URL: postgresql://postgres:Test%40123@postgres:5432/test
```

After fixing:
```bash
docker compose down
docker compose up -d
```

---

### Frontend not accessible from browser (ERR_CONNECTION_TIMED_OUT)
Check in order:

1. **Are containers running?**
   ```bash
   docker compose ps
   ```

2. **Does nginx respond locally?**
   ```bash
   curl http://localhost
   ```

3. **Is the IP correct?** Check current public IP:
   ```bash
   curl -s ifconfig.me
   ```
   Dynamic IPs change on reboot — use a Static IP (Step 0) to avoid this.

4. **Are firewall ports open?**
   Lightsail → instance → Networking → IPv4 Firewall must have port 80 open to **Any IPv4 address**.

---

### Seed fails — tsx: not found
**Cause:** `tsx` is a dev dependency not available in the production Docker image.
**Fix:** Run seed via `npx`:
```bash
docker compose exec backend npx tsx src/database/seeders/seed.ts
```
