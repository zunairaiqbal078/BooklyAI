# Deploy BooklyAI on one EC2 (FE + BE from this monorepo)

This stack runs **Nginx + Next.js + Express + Postgres** with Docker Compose.
One public URL serves the UI; `/api` and `/uploads` go to the backend.

```
Browser  →  :80 Nginx  →  web:3000 (Next.js)
                      →  api:4000  (Express)
                      →  postgres  (private)
```

## 1. EC2 prerequisites

1. Launch Ubuntu 22.04/24.04 (t3.small or larger recommended).
2. Security group inbound:
   - **22** SSH (your IP)
   - **80** HTTP
   - **443** HTTPS (later, if you add TLS)
3. SSH in and install Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out / back in so docker works without sudo
```

## 2. Clone the monorepo

```bash
git clone https://github.com/zunairaiqbal078/BooklyAI.git
cd BooklyAI
```

## 3. Configure env

```bash
cp .env.deploy.example .env
nano .env
```

Set at least:

| Variable | Example |
| --- | --- |
| `APP_URL` | `http://YOUR_EC2_PUBLIC_IP` (or `https://your.domain`) |
| `POSTGRES_PASSWORD` | strong password |
| `JWT_SECRET` | ≥ 32 random characters |

`APP_URL` is used for:

- Next.js `NEXT_PUBLIC_API_URL` (build arg)
- Express `FRONTEND_URL` / `PUBLIC_API_URL` (CORS + image URLs)

## 4. Build and start

```bash
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1/health
```

Open `http://YOUR_EC2_PUBLIC_IP` in a browser.

Optional seed (demo users) — seed tooling is not in the slim API image, so install `tsx` once:

```bash
docker compose exec api sh -c "npm install tsx && npx prisma db seed"
```

Demo logins (after seed): see root `README.md`.

## 5. Useful commands

```bash
docker compose logs -f api
docker compose logs -f web
docker compose restart api
docker compose down          # stop (keeps DB volume)
docker compose up -d --build # redeploy after git pull
```

Update after pushing code:

```bash
cd ~/BooklyAI
git pull
docker compose up -d --build
```

## 6. HTTPS (recommended before real users)

Point a domain A-record to the EC2 IP, then either:

- Put **Cloudflare** in front (proxy + SSL), keep `APP_URL=https://your.domain`, rebuild web; or
- Install **Certbot** / terminate TLS on Nginx and set `APP_URL=https://...`

Auth cookies use `Secure` in production — for IP-only `http://` testing, login cookies may be blocked by modern browsers. Prefer a domain + HTTPS for auth flows.

## 7. Notes

- Postgres is **not** published on the host; only Nginx `:80` is public.
- Uploads persist in Docker volume `booklyai_uploads`.
- DB data persists in `booklyai_pgdata`.
- Local BE `docker-compose.yml` (port 5433) is for **dev only**; production uses the root compose file.
