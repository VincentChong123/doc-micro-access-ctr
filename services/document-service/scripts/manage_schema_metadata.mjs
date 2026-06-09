import dotenv from 'dotenv';
import fs from 'fs';
import YAML from 'yaml';
import { setDeveloperMetadata, getDeveloperMetadata } from '../services/sheets.service.js';

dotenv.config();

// Load YAML Config
const file = fs.readFileSync('./src/config/app.yaml', 'utf8');
const config = YAML.parse(file);

async function main() {
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;

    console.log("url to spreadsheet: https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID);
    try {
        console.log("Checking for existing Developer Metadata...");
        let metadata = await getDeveloperMetadata(SPREADSHEET_ID);

        // if (metadata.length === 0) {
        //     console.log("No metadata found. Injecting OpenAPI schema pointer...");
        //
        //     const schemaVersion = config.google_sheets.schema_mapping.default_version;
        //     const domain = config.google_sheets.schema_mapping.domain;
        //
        //     await setDeveloperMetadata(SPREADSHEET_ID, "schema_version", schemaVersion);
        //     await setDeveloperMetadata(SPREADSHEET_ID, "schema_url", `https://api.internal.${domain}/schemas/openapi3-ringisho-spec.json`);
        //
        //     console.log("✅ Successfully embedded schema metadata.");
        //
        //     // Re-fetch to prove it's there
        //     metadata = await getDeveloperMetadata(SPREADSHEET_ID);
        // }

        console.log("\n--- Embedded Spreadsheet Metadata ---");
        metadata.forEach(m => {
            const data = m.developerMetadata;
            console.log(`[${data.visibility}] ${data.metadataKey}: ${data.metadataValue}`);
        });
        console.log("-------------------------------------");


    } catch (err) {
        console.error("Error managing developer metadata:", err.message);
    }
}

main();
