import { updateRange } from '../services/sheets.service.js';
import { logApprovalToLedger } from '../services/database.service.js';

export const handleApprovalWebhook = async (req, res) => {
    try {
        // AppSheet sends the data in req.body
        const { case_ref_id, status, content, purpose, remarks, approver_email } = req.body;

        if (!case_ref_id) {
            return res.status(400).json({ error: "case_ref_id is required" });
        }

        console.log(`\n[Webhook Received] Processing approval for ${case_ref_id}...`);

        if (status === 'Approved') {
            // 1. Log the cryptographic proof to our MVP Append-Only Ledger
            const auditRecord = logApprovalToLedger(req.body);
            
            // 2. Optionally, update the UI buffer in Google Sheets
            // await updateRange(process.env.SPREADSHEET_1_ID, 'cell_control!B1', [["Approved"]]);
            
            console.log(`✅ Case ${case_ref_id} successfully approved and locked in ledger.`);
            
            return res.status(200).json({ 
                message: "Approval processed successfully",
                audit_hash: auditRecord.document_hash
            });
        } else {
            console.log(`⚠️ Case ${case_ref_id} status is '${status}'. No DB action taken.`);
            return res.status(200).json({ message: "Status is not Approved. Ignored." });
        }
    } catch (error) {
        console.error("[Webhook Error]:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
