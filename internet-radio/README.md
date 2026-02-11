# Internet Radio with Monetization

Full-stack internet radio platform with song ordering, subscriptions, AI DJ bot, analytics, and payment integration.

## Features

- Live audio streaming via Icecast2 + Liquidsoap
- Song ordering system with queue management
- Custom song orders (user-provided lyrics)
- AI DJ bot — generates spoken announcements via OpenAI + TTS
- GPT-powered analytics agent for admin dashboard
- Three-tier subscription system (Basic / Premium / VIP)
- YooKassa payment integration
- Real-time chat via WebSocket
- Audio protection (HLS + AES-128 encryption)
- Admin dashboard with drag-and-drop song upload

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, PostgreSQL, Redis |
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Streaming | Icecast2, Liquidsoap |
| AI | OpenAI GPT-4o-mini, edge-tts |
| Payments | YooKassa |
| Infra | Docker, Nginx |

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit each `.env` file and fill in your API keys and secrets.

### 2. Launch with Docker

```bash
docker-compose up -d
```

This starts all services:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Backend API** on port 3000
- **Frontend** on port 3001
- **Icecast** on port 8000
- **Nginx** on port 80/443

### 3. Access

- Frontend: http://localhost (via Nginx) or http://localhost:3001
- API: http://localhost/api or http://localhost:3000/api
- Stream: http://localhost/stream or http://localhost:8000/stream
- Admin: http://localhost/admin (login with admin credentials)

### Default Admin Account

- Email: `admin@radio.local`
- Password: `admin123`

## Project Structure

```
internet-radio/
├── docker-compose.yml          # All services orchestration
├── backend/                    # Express API server
│   ├── config/                 # DB, Redis, OpenAI connections
│   ├── db/                     # SQL schema and seed data
│   ├── middleware/              # Auth, rate limiting, errors
│   ├── routes/                 # API endpoints
│   ├── services/               # Business logic (DJ bot, payments, etc.)
│   ├── websocket/              # Chat WebSocket server
│   └── utils/                  # Logger, helpers
├── frontend/                   # Next.js 14 application
│   └── src/
│       ├── app/                # Pages (App Router)
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks
│       ├── context/            # Auth context
│       └── lib/                # API client
├── streaming/                  # Icecast + Liquidsoap
│   ├── icecast.xml
│   ├── radio.liq
│   └── Dockerfile
└── nginx/
    └── radio.conf              # Reverse proxy configuration
```

## Environment Variables

See `.env.example` files in root, `backend/`, and `frontend/` directories for all required variables.

## Adding Music

1. Place MP3 files in the `music/` volume (or use admin dashboard upload)
2. Liquidsoap will automatically pick up new files for rotation
3. Admin can upload via drag-and-drop at `/admin/upload`

## Payment Setup (YooKassa)

1. Register at https://yookassa.ru
2. Get your Shop ID and Secret Key
3. Set webhook URL to `https://yourdomain.com/api/payments/webhook`
4. Configure `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET` in backend `.env`

## SSL Setup

```bash
# Install certbot on host
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
```

Update `nginx/radio.conf` with your certificate paths.

## License

MIT
