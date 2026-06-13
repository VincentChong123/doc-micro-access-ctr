# Ringisho Enterprise Platform Architecture

The central routing contract for the Ringisho Platform.

## ⚠️ Internal Routing Rules (Express Mount Path Stripping)

This platform uses an API Gateway architecture built on Node.js Express.
Frontend clients **must** request the absolute, fully-qualified path.
However, Express uses `app.use()` which automatically **strips** the mount prefix before forwarding to backend microservices.

Backend developers must design their microservices to listen ONLY for the stripped remainder.

| Microservice       | Frontend URL Path         | Express Mount | Backend Receives Path |
|--------------------|---------------------------|---------------|-----------------------|
| Python AI Service  | `/api/ai/v1/sheet-chat`   | `/api/ai`     | `/v1/sheet-chat`      |
| Node Document Svc  | `/api/workflow/approve`   | `/api/workflow`| `/approve`            |

## 🌐 Environment Routing & Port Mapping

| Service | Local Non-Docker (Browser / Host) | Local Docker (`ringisho-net` Internal DNS) | GCP Cloud Run (Production) |
| :--- | :--- | :--- | :--- |
| **AI Service** | `http://localhost:8080` | `http://ai_service:8080` | `https://ai-service-[hash]-[region].a.run.app` |
| **Document Service** | `http://localhost:4000` | `http://document_service:4000` | `https://doc-service-[hash]-[region].a.run.app` |
| **API Gateway** | `http://localhost:3000` | `http://api_gateway:3000` | `https://api-gateway-[hash]-[region].a.run.app` |
