import { updateRange } from '../services/sheets.service.js';
import dotenv from 'dotenv';

// Ensure .env is loaded so we can pull the SPREADSHEET_ID
dotenv.config({ path: '../../.env' });
dotenv.config();

/**
 * 🤖 LLM TOOL API: js_function_update_cell
 * Designed specifically for Agentic Workflows to perform fine-grained, single-cell updates.
 *
 * @param {string} sheetName - The exact name of the Google Sheet tab (e.g., 'Ringisho')
 * @param {string} cellId - The exact cell location (e.g., 'C11', 'A1')
 * @param {string|number} cellValue - The new data to inject into the cell
 * @returns {Promise<string>} - Returns a string confirmation for the LLM to read.
 */
export async function js_function_update_cell(sheetName, cellId, cellValue) {
    const spreadsheetId = process.env.RINGI2_SPREADSHEET_ID;

    if (!spreadsheetId) {
        throw new Error("❌ System Error: RINGI2_SPREADSHEET_ID is missing from .env");
    }

    // Google Sheets requires A1 notation: 'SheetName!A1:A1'
    const range = `${sheetName}!${cellId}:${cellId}`;

    try {
        // Google Sheets API requires a 2D Array for values: [[ "Data" ]]
        await updateRange(spreadsheetId, range, [[cellValue]]);

        const successMsg = `✅ SUCCESS: Updated cell [${sheetName}!${cellId}] to "${cellValue}"`;
        console.log(successMsg);

        // Return a clean string so the LLM Agent knows the tool call succeeded
        return successMsg;

    } catch (error) {
        const errorMsg = `❌ FAILED to update [${sheetName}!${cellId}]: ${error.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
}

// Allow the script to be executed directly from the terminal by an AI Agent (CLI Tool Mode)
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log("Usage: node src/utils/spreadsheet_utils.js <SheetName> <CellID> <Value>");
        process.exit(1);
    }
    const [sheet, cell, ...valueParts] = args;
    const value = valueParts.join(" "); // Recombine value if it contains spaces
    js_function_update_cell(sheet, cell, value).catch(() => process.exit(1));
}
