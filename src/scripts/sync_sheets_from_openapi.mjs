import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { updateRange, addSheet } from '../services/sheets.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;
    const specPath = path.join(__dirname, '../../docs/openapi3-ringisho-spec.json');
    
    console.log(`Reading OpenAPI specification from ${specPath}...`);
    const specRaw = fs.readFileSync(specPath, 'utf8');
    const openapiSpec = JSON.parse(specRaw);
    
    const schemas = openapiSpec.components.schemas;
    
    for (const [schemaName, schemaDetails] of Object.entries(schemas)) {
        const sheetName = schemaDetails['x-google-sheet-name'];
        if (!sheetName) {
            console.log(`Schema ${schemaName} has no 'x-google-sheet-name'. Skipping.`);
            continue;
        }
        
        const properties = schemaDetails.properties;
        if (!properties) {
            console.log(`Schema ${schemaName} has no properties. Skipping.`);
            continue;
        }
        
        // Build the headers array explicitly using x-google-sheet-column
        const headers = [];
        let maxIndex = 0;
        
        for (const [propName, propDetails] of Object.entries(properties)) {
            const colLetter = propDetails['x-google-sheet-column'];
            if (colLetter) {
                // Convert A->0, B->1, etc.
                const index = colLetter.toUpperCase().charCodeAt(0) - 65;
                // Use the localized label if it exists, otherwise fallback to the technical English property name
                const headerText = propDetails['x-local-label'] || propName;
                headers[index] = headerText;
                if (index > maxIndex) maxIndex = index;
            } else {
                console.warn(`WARNING: Property ${propName} is missing x-google-sheet-column!`);
            }
        }
        
        // Fill any empty gaps with empty strings to prevent undefined in Google Sheets
        for (let i = 0; i <= maxIndex; i++) {
            if (!headers[i]) headers[i] = "";
        }
        
        console.log(`\nFound definition for Google Sheet tab: '${sheetName}' (from schema: ${schemaName})`);
        console.log(`Explicitly Mapped Headers:`, headers);
        
        try {
            console.log(`Attempting to create tab '${sheetName}'...`);
            await addSheet(SPREADSHEET_ID, sheetName);
            console.log(`✅ Created tab '${sheetName}'.`);
        } catch (err) {
            console.log(`Tab '${sheetName}' might already exist. Proceeding to format headers.`);
        }
        
        const endColLetter = String.fromCharCode(65 + maxIndex);
        const RANGE_NAME = `${sheetName}!A1:${endColLetter}1`;
        
        try {
            console.log(`Writing API headers to ${RANGE_NAME}...`);
            await updateRange(SPREADSHEET_ID, RANGE_NAME, [headers]);
            console.log(`✅ Successfully synced explicit OpenAPI headers to sheet '${sheetName}'.`);
        } catch (err) {
            console.error(`Failed to update headers for '${sheetName}':`, err.message);
        }
    }
}

main();
