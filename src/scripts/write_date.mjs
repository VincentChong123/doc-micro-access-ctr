import dotenv from 'dotenv';
import { updateRange } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    const SPREADSHEET_ID = process.env.SPREADSHEET_1_ID;
    const RANGE_NAME_1 = 'cell_control!A1';
    const RANGE_NAME_2 = 'read_write!A1';

    // Format: phase3 yyyymmdd hhmmss
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    const formattedString = `phase3 ${yyyy}${mm}${dd} ${hh}${min}${ss}`;

    try {
        console.log(`Writing "${formattedString}" to ${RANGE_NAME_1}...`);
        await updateRange(SPREADSHEET_ID, RANGE_NAME_1, [[formattedString]]);
        console.log(`Successfully updated ${RANGE_NAME_1}`);

        console.log(`Writing "${formattedString}" to ${RANGE_NAME_2}...`);
        await updateRange(SPREADSHEET_ID, RANGE_NAME_2, [[formattedString]]);
        console.log(`Successfully updated ${RANGE_NAME_2}`);
    } catch (err) {
        console.error("Error writing to sheet:", err.message);
    }
}
main();
