import { getDriveClient } from '../config/auth.js';
import dotenv from 'dotenv';

// Ensure .env is loaded (from project root)
dotenv.config({ path: '../../.env' });
dotenv.config();

/**
 * Creates a named snapshot of the spreadsheet in its Version History.
 * This is incredibly useful to run BEFORE an LLM makes a bunch of updates!
 *
 * @param {string} versionName - The name to give this snapshot (e.g., "Pre-AI Update")
 */
async function nameCurrentVersion(versionName) {
    const spreadsheetId = process.env.RINGI2_SPREADSHEET_ID;

    if (!spreadsheetId) {
        throw new Error("❌ System Error: RINGI2_SPREADSHEET_ID is missing from .env");
    }

    // We must use the DRIVE API (not Sheets API) to manipulate version history
    const drive = await getDriveClient();

    try {
        console.log(`📡 Fetching revision history for Spreadsheet ID: ${spreadsheetId}...`);

        // 1. Get the list of all revisions
        const res = await drive.revisions.list({ fileId: spreadsheetId });

        if (!res.data.revisions || res.data.revisions.length === 0) {
            console.log("⚠️ No revisions found.");
            return;
        }

        // 2. The last revision in the array is the "Current State"
        const latestRevision = res.data.revisions.pop();
        console.log(`📌 Found current revision ID: ${latestRevision.id}`);

        // 3. Update the revision to pin it permanently!
        await drive.revisions.update({
            fileId: spreadsheetId,
            revisionId: latestRevision.id,
            requestBody: {
                keepForever: true,  // Prevents Google from auto-deleting it to save space
                published: true
            }
        });

        console.log(`✅ SUCCESS: The current Google Sheet state has been pinned permanently in Version History.`);

    } catch (error) {
        console.error(`❌ FAILED to name version history: ${error.message}`);
        // Note: If you get a 403 Forbidden here, ensure your Service Account
        // has 'https://www.googleapis.com/auth/drive.file' scope!
    }
}

// Allow CLI execution: node src/scripts/name_sheet_version.mjs "My Snapshot Name"
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const args = process.argv.slice(2);
    const versionName = args.length > 0 ? args.join(" ") : `API Snapshot: ${new Date().toISOString()}`;

    nameCurrentVersion(versionName);
}
