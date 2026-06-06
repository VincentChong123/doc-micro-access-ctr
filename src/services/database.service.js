import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Using JSON Lines (.jsonl) because it is natively an append-only format.
// You cannot modify a specific line without rewriting the whole file,
// which accurately simulates an append-only database.
const DB_FILE = path.join(__dirname, '../../audit_ledger.jsonl');

export function logApprovalToLedger(data) {
    const timestamp = new Date().toISOString();

    // 1. Create a cryptographic hash of the critical content to ensure non-repudiation
    const contentString = JSON.stringify({
        case_ref_id: data.case_ref_id,
        content: data.content,
        purpose: data.purpose,
        remarks: data.remarks
    });

    const hash = crypto.createHash('sha256').update(contentString).digest('hex');

    // 2. Create the immutable audit record
    const record = {
        timestamp,
        case_ref_id: data.case_ref_id,
        action: data.status,
        approver: data.approver_email || "system_user",
        document_hash: hash
    };

    // 3. Append to JSONL file (Append-Only operation)
    fs.appendFileSync(DB_FILE, JSON.stringify(record) + '\n');
    console.log(`[LEDGER] Record securely appended for ${data.case_ref_id} with Hash: ${hash.substring(0,8)}...`);

    return record;
}
