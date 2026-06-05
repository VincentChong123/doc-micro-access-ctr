import { updateRange } from '../services/sheets.service.js';

export const handleApprovalWebhook = async (req, res) => {
    try {
        // AppSheet sends the data in req.body
        const { case_ref_id, status, content, purpose, remarks } = req.body;

        if (!case_ref_id) {
            return res.status(400).json({ error: "case_ref_id is required" });
        }

        console.log(`\n[Webhook Received] Processing approval for ${case_ref_id}...`);

        if (status === 'Approved') {
            // In Phase 4, we will add schema validation and insert this into the Central DB.
            // For now, we simulate processing the approved structured data.
            console.log(`✅ Case ${case_ref_id} successfully approved.`);
            console.log(`Extracted Data to route to Core Banking DB:`, { content, purpose, remarks });
            
            return res.status(200).json({ message: "Approval processed successfully" });
        } else {
            console.log(`⚠️ Case ${case_ref_id} status is '${status}'. No DB action taken.`);
            return res.status(200).json({ message: "Status is not Approved. Ignored." });
        }
    } catch (error) {
        console.error("[Webhook Error]:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
