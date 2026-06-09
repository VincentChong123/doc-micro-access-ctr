import { Router } from 'express';
import { handleApprovalWebhook } from '../controllers/appsheet.controller.js';

const router = Router();

// Endpoint for Google AppSheet Webhook: POST /api/webhook/appsheet
router.post('/appsheet', handleApprovalWebhook);

export default router;
