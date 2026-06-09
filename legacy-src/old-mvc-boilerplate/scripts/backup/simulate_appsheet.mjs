import { handleApprovalWebhook } from '../controllers/appsheet.controller.js';

const mockReq = {
    body: {
        case_ref_id: "GLOBAL-BANK-RNG-20260605-001",
        status: "Approved",
        content: "法人オーナー様への事業承継および資産運用スキーム提案に関する報告",
        purpose: "次回の顧客面談にて自信を持って最適な提案を行うため。",
        remarks: "チーム一体となって提案を作り上げています。",
        approver_email: "manager@global-bank.local"
    }
};

const mockRes = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log(`[HTTP ${this.statusCode}] Response:`, data);
    }
};

async function main() {
    console.log("Simulating AppSheet Webhook firing...");
    await handleApprovalWebhook(mockReq, mockRes);
}

main();
