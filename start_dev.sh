#!/bin/bash

echo "🚀 Booting up the Ringisho Monorepo..."

# 1. Start Python AI Service (Port 8000)
echo "🧠 Starting Python AI Service on Port 8000..."
cd /home/vin/01-prj/doc-micro-access-ctr/services/ai-service
# Attempt to activate virtual environment if it exists
source .venv/bin/activate 2>/dev/null || true
python main.py &
AI_PID=$!

# 2. Start Node Document Service (Port 4000)
echo "📄 Starting Node Document Service on Port 4000..."
cd /home/vin/01-prj/doc-micro-access-ctr/services/document-service
node server.mjs &
DOC_PID=$!

# Give the backend services 2 seconds to fully boot up so the Gateway health checks pass
sleep 2

# 3. Start Node API Gateway (Port 3000)
echo "🚦 Starting API Gateway on Port 3000..."
cd /home/vin/01-prj/doc-micro-access-ctr/gateway/api-gateway
node server.mjs &
GATEWAY_PID=$!

# =========================================================
# THE MAGIC SHUTDOWN TRAP
# When you press CTRL+C, this automatically kills all 3 servers!
# =========================================================
trap "echo -e '\n🛑 Shutting down all Ringisho services...'; kill $AI_PID $DOC_PID $GATEWAY_PID; exit" SIGINT SIGTERM

echo "✅ All services running in the background! Logs will appear below."
echo "⌨️  Press CTRL+C at any time to stop all servers simultaneously."

# Wait indefinitely, streaming the logs from all 3 services to this terminal
wait
