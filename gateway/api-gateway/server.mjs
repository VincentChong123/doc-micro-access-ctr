import express from 'express';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import net from 'net';

const app = express();

// ==============================================================
// 1. CONTRACT-FIRST SWAGGER UI
// ==============================================================
if (0) {
    const CONTRACT_PATH = '/home/vin/01-prj/doc-micro-access-ctr/docs/schema_contract/schema_version=2026-06-06/openapi3-ringisho-spec.json';
    if (fs.existsSync(CONTRACT_PATH)) {
        const openapiContract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));
        app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiContract));
    } else {
        console.warn("⚠️ Swagger Contract JSON not found at path.");
    }
}

// ==============================================================
// 2. THE API GATEWAY PROXIES (MUST BE BEFORE express.json)
// ==============================================================
// AI Service -> Forwards to Python on Port 8000
app.use('/api/ai', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true
}));

// Document Service -> Forwards to Node.js on Port 4000
app.use('/api/workflow', createProxyMiddleware({
    target: 'http://localhost:4000',
    changeOrigin: true
}));

app.use(express.json());

// Start Gateway
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚦 API Gateway running on http://localhost:${PORT}`);
    console.log(`👉 Swagger Docs: http://localhost:${PORT}/docs`);
    console.log(`🔄 Proxying /api/ai -> Python (8000) | /api/workflow -> Node.js (4000)\n`);

    // ==============================================================
    // HEALTH CHECKS
    // ==============================================================
    const checkServiceHealth = (port, serviceName) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => {
            console.log(`✅ Port ${port} ready for ${serviceName}`);
            socket.destroy();
        }).on('error', () => {
            console.log(`❌ Port ${port} NOT ready for ${serviceName} (Start the server!)`);
        }).on('timeout', () => {
            console.log(`❌ Port ${port} TIMEOUT for ${serviceName}`);
            socket.destroy();
        }).connect(port, '127.0.0.1');
    };

    checkServiceHealth(4000, 'Document Service');
    checkServiceHealth(8000, 'AI Service');
});
