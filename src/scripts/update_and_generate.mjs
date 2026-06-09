import { updateRange } from '../services/sheets.service.js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Ensure .env is loaded (from project root)
dotenv.config({ path: '../../.env' });
dotenv.config(); // Fallback if run from root

/**
 * Updates multiple cells in a Google Sheet based on their Cell ID.
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {Object} cellUpdates - Key-Value pair of Cell IDs and their new values (e.g. { "C4": "2026-06-08", "A1": "Hello" })
 */
async function updateCellsById(spreadsheetId, sheetName, cellUpdates) {
    console.log(`\n🔄 Starting cell-id based update on [${sheetName}]...`);

    for (const [cellId, value] of Object.entries(cellUpdates)) {
        const range = `${sheetName}!${cellId}:${cellId}`;
        try {
            await updateRange(spreadsheetId, range, [[value]]);
            console.log(`  ✅ Updated ${cellId} ➔ "${value}"`);
        } catch (error) {
            console.error(`  ❌ Failed to update ${cellId}: ${error.message}`);
        }
    }
}

async function updateAndGenerate() {
    const spreadsheetId = process.env.RINGI2_SPREADSHEET_ID;
    const sheetName = 'Ringisho';

    // 1. Define the cell-id based updates
    const updates = {
        "C4": "2026年6月8日", // Update Date
        "E5": "鈴木太郎 (Approved)", // Example update
    };

    // 2. Execute the update function
    await updateCellsById(spreadsheetId, sheetName, updates);

    // 3. Run the PDF generator
    console.log("\n📄 Triggering PDF Generation...");
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        execSync(`node src/scripts/generate_approval_pdf.mjs "${timestamp}-approval"`, { stdio: 'inherit' });
    } catch (e) {
        console.error("PDF Generation failed:", e.message);
    }
}

updateAndGenerate();
