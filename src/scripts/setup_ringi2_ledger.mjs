import dotenv from 'dotenv';
import { updateRange, addSheet } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    // Targeting the ringi2 sheet
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;
    const SHEET_NAME = 'Tracking_Ledger';

    try {
        console.log(`Creating new tab '${SHEET_NAME}' in ringi2 sheet...`);
        try {
            await addSheet(SPREADSHEET_ID, SHEET_NAME);
            console.log(`✅ Created tab '${SHEET_NAME}'`);
        } catch (err) {
            // Ignore error if sheet already exists (usually code 400)
            console.log(`Tab '${SHEET_NAME}' might already exist. Proceeding to format...`);
        }

        const RANGE_NAME = `${SHEET_NAME}!A1:H2`;

        const now = new Date();
        const dateStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');

        const headersAndMockData = [
            // Row 1: Headers
            [
                "case_ref_id",
                "Draft_Owner_Email",
                "Receiver_Email",
                "Email_Memo",
                "Send_to_Checker",
                "Draft_PDF_URL",
                "Confirmed_Review",
                "Approval_Status"
            ],

            // Row 2: Mock Data
            [
                `GLOBAL-BANK-RNG-${dateStr}-001`,
                "owner@global-bank.local",
                "manager@global-bank.local",
                "Hi Boss, please review the Toyota deal.",
                "FALSE",
                "https://drive.google.com/file/d/mock-pdf-12345/view",
                "FALSE",
                "Pending"
            ]
        ];

        console.log(`Configuring AppSheet Ledger columns in ${RANGE_NAME}...`);
        await updateRange(SPREADSHEET_ID, RANGE_NAME, headersAndMockData);
        console.log(`✅ Successfully formatted ${SHEET_NAME} sheet for AppSheet integration!`);
    } catch (err) {
        console.error("Error setting up tracking ledger:", err.message);
    }
}
main();
