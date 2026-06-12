import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;
const REVISION_NAME = process.argv[2] || "2026-06-07-22-50-send-approval";

async function main() {
    console.log(`🚀 Starting PDF Extraction for Revision: ${REVISION_NAME}`);

    // 1. Initialize Google Auth with both Drive and Sheets scopes
    const auth = new GoogleAuth({
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ]
    });
    const authClient = await auth.getClient();

    // 2. Drive API: Fetch the actual Revision ID
    console.log("📡 Fetching Revision History from Google Drive API...");
    const drive = google.drive({ version: 'v3', auth: authClient });
    const revisionsRes = await drive.revisions.list({
        fileId: SPREADSHEET_ID,
        fields: 'revisions(id, modifiedTime, originalFilename)'
    });

    // Get the absolute latest revision as the target state
    const revisions = revisionsRes.data.revisions;
    const latestRevision = revisions[revisions.length - 1];
    const systemRevisionId = latestRevision.id;
    console.log(`✅ Found Latest System Revision ID: ${systemRevisionId} (Modified: ${latestRevision.modifiedTime})`);

    // 3. Sheets API: Find the GID for the "Ringisho" tab
    console.log("📡 Resolving Sheet GID for 'Ringisho'...");
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const targetSheet = sheetMetadata.data.sheets.find(s => s.properties.title === 'Ringisho');

    if (!targetSheet) {
        console.error("❌ Error: Could not find a tab named 'Ringisho' in the spreadsheet.");
        process.exit(1);
    }
    const gid = targetSheet.properties.sheetId;

    // 4. Download specific Range (B1:E11) as PDF
    console.log(`⬇️  Downloading PDF for Ringisho!B1:E11...`);
    // Added printnotes=false to ensure the cell instructions do not appear in the final PDF
    const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=pdf&gid=${gid}&range=B1:E11&gridlines=false&printnotes=false`;

    const token = await authClient.getAccessToken();
    const pdfResponse = await fetch(exportUrl, {
        headers: { 'Authorization': `Bearer ${token.token}` }
    });

    if (!pdfResponse.ok) throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    const rawPdfBuffer = await pdfResponse.arrayBuffer();

    // 5. PDF-LIB: Stamp the Metadata
    console.log("📝 Embedding Revision Metadata into PDF...");
    const pdfDoc = await PDFDocument.load(rawPdfBuffer);

    // Standard Fields
    pdfDoc.setTitle(`Approval Artifact: ${REVISION_NAME}`);
    pdfDoc.setAuthor('Antigravity Node.js System');

    // You can use the 'Subject' field to store long strings like URLs or IDs
    pdfDoc.setSubject(`Source Spreadsheet ID: ${SPREADSHEET_ID} | Revision ID: ${systemRevisionId}`);

    // Add the Spreadsheet ID to the Keywords
    pdfDoc.setKeywords([
        `ApprovalName: ${REVISION_NAME}`,
        `SystemRevisionID: ${systemRevisionId}`,
        `SpreadsheetID: ${SPREADSHEET_ID}`
    ]);

    // 6. Save locally (Ready for MinIO!)
    const finalPdfBytes = await pdfDoc.save();
    const dataPath = "data"
    const outputPath = dataPath + `/${REVISION_NAME}.pdf`;

    // Ensure the folder exists before saving
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    fs.writeFileSync(outputPath, finalPdfBytes);

    console.log(`🎉 Success! PDF saved with embedded metadata at: ${outputPath}`);

    // 7. Write the PDF Path back to Google Sheets!
    console.log(`📝 Calling sheets_service to write path back to Ringisho!G1...`);
    // Import dynamically so we don't break earlier script logic if it fails
    const { js_function_update_cell } = await import('./sheets_service.mjs');
    await js_function_update_cell('Ringisho', 'G1', outputPath);
    console.log(`✅ Workflow Complete! Cell updated.`);
}

main().catch(console.error);
