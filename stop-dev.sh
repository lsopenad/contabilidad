#!/usr/bin/env bash
# Para uvicorn (:8000) y vite (:4000)

parado=0

matar_por_puerto() {
  local puerto=$1
  local pids
  pids=$(lsof -ti tcp:"$puerto" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -TERM 2>/dev/null
    parado=$((parado + 1))
    echo "✓  Puerto $puerto parado (PID $pids)"
  else
    echo "–  Puerto $puerto sin proceso"
  fi
}

matar_por_puerto 8000
matar_por_puerto 4000

[ $parado -eq 0 ] && echo "Nada que parar." || echo "Listo."
