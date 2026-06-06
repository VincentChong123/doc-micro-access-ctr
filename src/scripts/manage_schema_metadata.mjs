import dotenv from 'dotenv';
import { setDeveloperMetadata, getDeveloperMetadata } from '../services/sheets.service.js';

dotenv.config();

async function main() {
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;
    
    try {
        console.log("Checking for existing Developer Metadata...");
        let metadata = await getDeveloperMetadata(SPREADSHEET_ID);
        
        if (metadata.length === 0) {
            console.log("No metadata found. Injecting OpenAPI schema pointer...");
            
            await setDeveloperMetadata(SPREADSHEET_ID, "schema_version", "2026-06-06");
            await setDeveloperMetadata(SPREADSHEET_ID, "schema_url", "https://api.internal.mufg.jp/schemas/openapi3-ringisho-spec.json");
            
            console.log("✅ Successfully embedded 'PROJECT' level schema metadata.");
            
            // Re-fetch to prove it's there
            metadata = await getDeveloperMetadata(SPREADSHEET_ID);
        }
        
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
