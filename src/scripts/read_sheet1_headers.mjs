import dotenv from 'dotenv';
import { readRange } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;
    const SHEET_NAME = 'Sheet1';

    try {
        const data = await readRange(SPREADSHEET_ID, `${SHEET_NAME}!A1:Z1`);
        console.log("Sheet1 Headers:", data[0]);
    } catch (err) {
        console.error("Error reading Sheet1:", err.message);
    }
}
main();
