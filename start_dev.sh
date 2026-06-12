#!/bin/bash

#  killall node ngrok && pkill -f uvicorn

echo "🚀 Booting up the Ringisho Monorepo..."



# 2. Start Node Document Service (Port 4000)
echo "📄 Starting Node Document Service on Port 4000..."
cd /home/vin/01-prj/doc-micro-access-ctr/services/document_service
node server.mjs &
DOC_PID=$!


# # 1. Start Python AI Service (Port 8000)
# echo "🧠 Starting Python AI Service on Port 8000..."
# cd services/ai_service
# # Attempt to activate virtual environment if it exists
# source .venv/bin/activate 2>/dev/null || true
# python /home/vin/01-prj/doc-micro-access-ctr/services/ai_service/main.py & AI_PID=$!


# Give the backend services 2 seconds to fully boot up so the Gateway health checks pass
sleep 2

# 3. Start Node API Gateway (Port 3000)
echo "🚦 Starting API Gateway on Port 3000..."
cd /home/vin/01-prj/doc-micro-access-ctr/gateway/api_gateway
node server.mjs &
GATEWAY_PID=$!

# 4. Start Ngrok Internet Tunnel
echo "🌐 Starting Ngrok Tunnel (supply-various-paralyze.ngrok-free.dev) -> Port 3000..."
# Using --log=stdout and sending to /dev/null suppresses Ngrok's terminal UI
ngrok http --domain=supply-various-paralyze.ngrok-free.dev 3000 --log=stdout > /dev/null &
NGROK_PID=$!


# =========================================================
# THE MAGIC SHUTDOWN TRAP
# When you press CTRL+C, this automatically kills all 4 servers!
# =========================================================
trap "echo -e '\n🛑 Shutting down all Ringisho services...'; kill $AI_PID $DOC_PID $GATEWAY_PID $NGROK_PID; exit" SIGINT SIGTERM

echo "✅ All services running in the background! Logs will appear below."
echo "⌨️  Press CTRL+C at any time to stop all servers simultaneously."

# Wait indefinitely, streaming the logs from all 3 services to this terminal
wait
