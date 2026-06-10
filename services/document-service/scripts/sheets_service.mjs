import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

// Ensure .env is loaded
dotenv.config({ path: '../../.env' });
dotenv.config();

/**
 * 🤖 LLM TOOL API: js_function_update_cell
 * Designed to perform fine-grained, single-cell updates from backend Node.js.
 *
 * @param {string} sheetName - The exact name of the Google Sheet tab (e.g., 'Ringisho')
 * @param {string} cellId - The exact cell location (e.g., 'C11', 'A1')
 * @param {string|number} cellValue - The new data to inject into the cell
 * @returns {Promise<string>} - Returns a string confirmation
 */
export async function js_function_update_cell(sheetName, cellId, cellValue) {
    const spreadsheetId = process.env.RINGI2_SPREADSHEET_ID;

    if (!spreadsheetId) {
        throw new Error("❌ System Error: RINGI2_SPREADSHEET_ID is missing from .env");
    }

    try {
        // 1. Initialize Google Auth with Sheets scope
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const authClient = await auth.getClient();

        // 2. Initialize the Sheets API
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        // 3. Google Sheets requires A1 notation: 'SheetName!A1:A1'
        const range = `${sheetName}!${cellId}:${cellId}`;

        // 4. Update the cell natively
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[cellValue]] // Must be a 2D Array
            }
        });

        const successMsg = `✅ SUCCESS: Updated cell [${sheetName}!${cellId}] to "${cellValue}"`;
        console.log(successMsg);
        return successMsg;

    } catch (error) {
        const errorMsg = `❌ FAILED to update [${sheetName}!${cellId}]: ${error.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
}

// Allow the script to be executed directly from the terminal (CLI Tool Mode)
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log("Usage: node sheets_service.mjs <SheetName> <CellID> <Value>");
        process.exit(1);
    }
    const [sheet, cell, ...valueParts] = args;
    const value = valueParts.join(" "); // Recombine value if it contains spaces
    js_function_update_cell(sheet, cell, value).catch(() => process.exit(1));
}
