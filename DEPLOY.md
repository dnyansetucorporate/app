# Deployment Guide — AWS Lightsail (Ubuntu 24.04)

## Prerequisites
- Lightsail instance running Ubuntu 24.04
- Repo cloned at `~/src/app`
- Instance public IP: `43.205.115.70`

---

## Step 1 — Install Docker

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

## Step 2 — Navigate to project

```bash
cd ~/src/app
```

---

## Step 3 — Create .env file

```bash
cat > .env << 'EOF'
VITE_API_URL=http://43.205.115.70:5000/api
CORS_ORIGIN=http://43.205.115.70
EOF
```

---

## Step 4 — Build and start all containers

```bash
docker compose up -d --build
```

> Takes 5–10 minutes on first run. Wait for it to complete.

---

## Step 5 — Run database migrations

```bash
docker compose exec backend npx prisma migrate deploy
```

---

## Step 6 — Seed initial data

```bash
docker compose exec backend npm run seed
```

---

## Step 7 — Open firewall ports in Lightsail console

1. Go to Lightsail → Your instance → **Networking** tab
2. Under **IPv4 Firewall**, click **Add rule**
3. Add port **80** (TCP) — frontend
4. Add port **5000** (TCP) — backend API

---

## Verify everything is running

```bash
docker compose ps
```

All 3 containers should show `Up`:
- `postgres`
- `backend`
- `frontend`

---

## Access the app

| Service  | URL                                  |
|----------|--------------------------------------|
| Frontend | http://43.205.115.70                 |
| API      | http://43.205.115.70:5000/api        |

---

## Useful commands

```bash
# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
docker compose logs -f frontend

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
