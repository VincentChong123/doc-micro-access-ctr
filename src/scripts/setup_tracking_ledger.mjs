import dotenv from 'dotenv';
import { updateRange } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    const SPREADSHEET_ID = process.env.SPREADSHEET_1_ID;

    // We will set up the cell_control sheet as our AppSheet tracking ledger
    const RANGE_NAME = 'cell_control!A1:D2';

    const headersAndMockData = [
        // Row 1: Headers (AppSheet needs these to build the UI columns)
        ["case_ref_id", "Draft_PDF_URL", "Confirmed_Review", "Approval_Status"],

        // Row 2: Mock Data (So you can immediately see the UI in AppSheet)
        [
            "MUFG-RNG-20260605-001",
            "https://drive.google.com/file/d/mock-pdf-12345/view",
            "FALSE",
            "Pending"
        ]
    ];

    try {
        console.log(`Configuring AppSheet Ledger columns in ${RANGE_NAME}...`);
        await updateRange(SPREADSHEET_ID, RANGE_NAME, headersAndMockData);
        console.log(`✅ Successfully formatted cell_control sheet for AppSheet integration!`);
    } catch (err) {
        console.error("Error writing to sheet:", err.message);
    }
}
main();
