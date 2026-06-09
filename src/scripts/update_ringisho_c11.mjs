import dotenv from 'dotenv';
import { updateRange } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;
    const SHEET_NAME = 'Ringisho';
    const RANGE = `${SHEET_NAME}!C11`;

    const NEW_VALUE = "・顧客企業の決算書および事前調査メモ\n・資産運用・不動産シミュレーション資料\n・税理士との節税対策に関する協議録";

    console.log(`📡 Updating Google Sheet [${SHEET_NAME}] Cell C11...`);

    try {
        const response = await updateRange(SPREADSHEET_ID, RANGE, [[NEW_VALUE]]);
        console.log(`✅ Successfully updated ${response.updatedCells} cell(s) in Google Sheets.`);
    } catch (err) {
        console.error(`❌ Error updating sheet:`, err.message);
    }
}

main();
