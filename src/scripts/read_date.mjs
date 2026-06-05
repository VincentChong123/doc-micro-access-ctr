import dotenv from 'dotenv';
import { readRange } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    const SPREADSHEET_ID = process.env.SPREADSHEET_1_ID;
    const RANGE_NAME = 'read_write!A1';
    
    try {
        console.log(`Reading value from ${RANGE_NAME}...`);
        const data = await readRange(SPREADSHEET_ID, RANGE_NAME);
        if (data && data.length > 0) {
            console.log(`\n✅ Verification Successful!\nValue currently inside ${RANGE_NAME}: "${data[0][0]}"\n`);
        } else {
            console.log(`\nCell ${RANGE_NAME} is empty.\n`);
        }
    } catch (err) {
        console.error("Error reading from sheet:", err.message);
    }
}
main();
