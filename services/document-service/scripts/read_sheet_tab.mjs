import dotenv from 'dotenv';
import fs from 'fs';
import YAML from 'yaml';
import { readRange } from '../services/sheets.service.js';

dotenv.config();

// Load YAML Config
const file = fs.readFileSync('./src/config/app.yaml', 'utf8');
const config = YAML.parse(file);

async function main() {
    const args = process.argv.slice(2);

    // Check if user provided an argument
    if (args.length === 0) {
        console.error("❌ Error: Missing tab parameter.");
        console.log("Usage: node read_sheet_tab.mjs <tab_key> [output_json_path]");
        console.log("Available tab_keys from app.yaml:");
        console.log("  - drafting_canvas");
        console.log("  - metadata_tab");
        console.log("  - central_ledger");
        process.exit(1);
    }

    const tabKey = args[0];
    const outputPath = args[1];
    const SPREADSHEET_ID = process.env.RINGI2_SPREADSHEET_ID;

    // Resolve the actual Sheet Name from the YAML config using the provided key
    const SHEET_NAME = config.google_sheets.tabs[tabKey];

    if (!SHEET_NAME) {
        console.error(`❌ Error: Invalid tab key '${tabKey}'. It does not exist in src/config/app.yaml`);
        process.exit(1);
    }

    console.log(`\n🔍 Targeting YAML Key: [${tabKey}] -> Resolves to Sheet Name: [${SHEET_NAME}]`);
    console.log(`📡 Fetching from Spreadsheet ID: ${SPREADSHEET_ID}\n`);

    try {
        const data = await readRange(SPREADSHEET_ID, `${SHEET_NAME}!A1:Z50`);

        if (!data || data.length === 0) {
            console.log(`⚠️ The tab '${SHEET_NAME}' is empty or no data was found.`);
            return;
        }

        // Helper to convert 0-indexed column (0) to Letter (A)
        const colIndexToLetter = (index) => {
            let letter = '';
            let temp = index;
            while (temp >= 0) {
                letter = String.fromCharCode((temp % 26) + 65) + letter;
                temp = Math.floor(temp / 26) - 1;
            }
            return letter;
        };

        const resultJSON = {};

        data.forEach((row, rIndex) => {
            row.forEach((cellValue, cIndex) => {
                // Ignore empty cells to keep the JSON clean
                if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
                    const colLetter = colIndexToLetter(cIndex);
                    const rowNumber = rIndex + 1; // Google Sheets rows are 1-indexed
                    const cellLocation = `${colLetter}${rowNumber}`;

                    resultJSON[cellLocation] = cellValue;
                }
            });
        });

        const envelope = {
            metadata: {
                spreadsheet_id: SPREADSHEET_ID,
                sheet_name: SHEET_NAME,
                generated_at: new Date().toISOString(),
                encoding: "utf-8"
            },
            data: resultJSON
        };

        const jsonString = JSON.stringify(envelope, null, 2);
        if (outputPath) {
            fs.writeFileSync(outputPath, jsonString, 'utf8');
            console.log(`✅ JSON successfully saved to: ${outputPath}`);
        } else {
            console.log(`--- JSON Output of ${SHEET_NAME} ---`);
            console.log(jsonString);
            console.log("---------------------------------");
        }

    } catch (err) {
        console.error(`❌ Error reading ${SHEET_NAME}:`, err.message);
    }
}

main();
