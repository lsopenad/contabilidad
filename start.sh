#!/usr/bin/env bash
set -e
RAIZ="$(cd "$(dirname "$0")" && pwd)"

# ── Backend ───────────────────────────────────────────────────────────────────
cd "$RAIZ/backend"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  .env creado desde .env.example — edita las credenciales antes de continuar"
  exit 1
fi

pip3 install -r requirements.txt -q

pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
sleep 1

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "▶  Backend PID $BACKEND_PID — http://localhost:8000"

# ── Frontend ──────────────────────────────────────────────────────────────────
cd "$RAIZ/frontend"
pnpm install -s
pnpm dev &
FRONTEND_PID=$!
echo "▶  Frontend PID $FRONTEND_PID — http://localhost:4000"

# ── Limpieza al salir (Ctrl+C) ────────────────────────────────────────────────
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
