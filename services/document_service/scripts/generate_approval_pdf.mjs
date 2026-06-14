import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

    const pdfResponse = await authClient.request({
        url: exportUrl,
        method: 'GET',
        responseType: 'arraybuffer'
    });

    const rawPdfBuffer = pdfResponse.data;

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

    // 6.5 Upload to Cloud Storage / MinIO
    if (process.env.MINIO_ENDPOINT || process.env.GCP_CLOUD_STORAGE_INTEROPERABILITY_TEST_BUCKET_NAME) {
        console.log(`☁️  Uploading PDF to Storage Bucket...`);
        const endpoint = process.env.MINIO_ENDPOINT || "https://storage.googleapis.com";
        const accessKeyId = process.env.MINIO_ACCESS_KEY || process.env.GCP_CLOUD_STORAGE_INTEROPERABILITY_TEST_BUCKET_NAME_ACCESS_KEY;
        const secretAccessKey = process.env.MINIO_SECRET_KEY || process.env.GCP_CLOUD_STORAGE_INTEROPERABILITY_TEST_BUCKET_NAME_ACCESS_KEY_SECRET;
        const bucketName = process.env.MINIO_BUCKET_NAME || process.env.GCP_CLOUD_STORAGE_INTEROPERABILITY_TEST_BUCKET_NAME || "ringisho-pdf-bucket";

        const s3Client = new S3Client({
            region: "auto", // Region is required by SDK but often ignored by MinIO/GCS interoperability
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            },
            // MinIO usually requires path style, GCS can handle virtual hosted style
            forcePathStyle: !endpoint.includes("googleapis")
        });

        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: `${REVISION_NAME}.pdf`,
                Body: finalPdfBytes,
                ContentType: "application/pdf"
            }));
            let fullPath = `${endpoint}/${bucketName}/${REVISION_NAME}.pdf`;
            if (endpoint.includes(':9000')) {
                const webUiEndpoint = endpoint.replace(':9000', ':9001');
                fullPath = `${webUiEndpoint}/browser/${bucketName}/${REVISION_NAME}.pdf`;
            }
            console.log(`✅ Successfully uploaded ${REVISION_NAME}.pdf`);
            console.log(`🔗 Full Storage Path: ${fullPath}`);
        } catch (uploadError) {
            console.error(`❌ Failed to upload to ${bucketName}: ${uploadError.message}`);
        }
    } else {
        console.log(`⚠️  Skipping Cloud Storage upload (No MinIO or GCS Credentials provided in environment)`);
    }

    // 7. Write the PDF Path back to Google Sheets!
    console.log(`📝 Calling sheets_service to write path back to Ringisho!G1...`);
    // Import dynamically so we don't break earlier script logic if it fails
    const { js_function_update_cell } = await import('../utils/spreadsheet_utils.mjs');
    await js_function_update_cell('Ringisho', 'G1', outputPath);
    console.log(`✅ Workflow Complete! Cell updated.`);
}

main().catch(console.error);
