import express from 'express';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhook.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies from AppSheet webhooks
app.use(express.json());

// Register API Routes
app.use('/api/webhook', webhookRoutes);

// Simple Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Bank-Compliant Ringisho API is running' });
});

// Start the Express Server
app.listen(PORT, () => {
    console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    console.log(`Listening for Google AppSheet Webhooks at POST /api/webhook/appsheet`);
});
