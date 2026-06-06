#!/usr/bin/env node

/**
 * DocAccess: Secure Local Google Sheets API Co-Pilot
 * Uses official googleapis client. Authenticates via Application Default Credentials (ADC).
 * Fetches Sheet protections metadata directly, runs the LLM Maker loop,
 * validates cell updates against protectedRanges, and pushes verified writes.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m"
};

// --- PARSE ARGUMENTS ---
const args = parseArgs();

if (args.help || !args.spreadsheetId) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const spreadsheetId = args.spreadsheetId;
const promptText = args.prompt || '';
const sheetName = args.sheet || 'Sheet1';
const useRogue = args.rogue || false;

if (!promptText && !args.status) {
  console.log(`${colors.red}Error: Please specify edit instructions using --prompt or -p.${colors.reset}`);
  printHelp();
  process.exit(1);
}

main();

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}=================================================`);
  console.log(`     DocAccess Secure Google Sheets Co-Pilot      `);
  console.log(`    (Google IAM & Active Range Protections)      `);
  console.log(`=================================================${colors.reset}\n`);

  try {
    // 1. Initialize Google Sheets Auth (Application Default Credentials)
    console.log(`Authenticating with Google Workspace...`);
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // 2. Fetch sheet values and protections metadata
    console.log(`Fetching spreadsheet data (ID: ${colors.dim}${spreadsheetId}${colors.reset})...`);

    // Request metadata including sheets name and protectedRanges properties
    const sheetMetadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      fields: 'sheets(properties,protectedRanges)'
    });

    const spreadsheet = sheetMetadataResponse.data;
    const targetSheet = spreadsheet.sheets.find(s => s.properties.title === sheetName);

    if (!targetSheet) {
      throw new Error(`Sheet named "${sheetName}" not found in this spreadsheet.`);
    }

    const sheetId = targetSheet.properties.sheetId;
    const protectedRanges = targetSheet.protectedRanges || [];

    console.log(`Loaded Sheet: ${colors.bright}${sheetName}${colors.reset} (Protected Ranges Count: ${protectedRanges.length})`);

    // Fetch cell values
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:Z100` // Fetch standard active area
    });

    const rows = valuesResponse.data.values || [];
    if (rows.length === 0) {
      throw new Error('Spreadsheet active area is empty.');
    }

    const maxRow = rows.length;
    const maxCol = Math.max(...rows.map(r => r.length));

    // Construct structured cells list mapping to protections
    const cellsData = [];
    for (let r = 0; r < maxRow; r++) {
      for (let c = 0; c < maxCol; c++) {
        const val = rows[r]?.[c] !== undefined ? rows[r][c] : '';
        const isProtected = isCellProtected(r, c, protectedRanges);

        // Emulate formula check based on string starting with '='
        const hasFormula = typeof val === 'string' && val.startsWith('=');

        cellsData.push({
          row: r + 1,
          col: c + 1,
          value: val,
          access: isProtected ? 'readonly' : 'writable',
          formula: hasFormula ? val : null,
          address: getCellAddress(r + 1, c + 1)
        });
      }
    }

    // Print spreadsheet visual grid representation
    printGrid(cellsData, maxRow, maxCol);

    if (args.status) {
      // Just print grid status and exit
      process.exit(0);
    }

    // 3. Read System Prompts
    const systemMdPath = path.join(__dirname, 'system.md');
    if (!fs.existsSync(systemMdPath)) {
      throw new Error('system.md not found in workspace.');
    }
    const systemInstructions = fs.readFileSync(systemMdPath, 'utf8');

    // 4. Compile context (Redact hidden cells locally if marked by conventions or tag)
    // Note: The checker manually blocks llm@gmail.com from protected ranges.
    // We treat protectedRanges as 'readonly', and unprotected as 'writable'.
    const writableCount = cellsData.filter(c => c.access === 'writable').length;
    const readonlyCount = cellsData.filter(c => c.access === 'readonly').length;
    console.log(`Permission Summary:`);
    console.log(`- ${colors.green}${writableCount} cells open as Writable (Unprotected)${colors.reset}`);
    console.log(`- ${colors.yellow}${readonlyCount} cells locked as Read-Only (Protected Range)${colors.reset}`);

    // 5. Call LLM Maker API
    console.log(`\nCalling LLM Maker...`);
    let proposedUpdates = [];

    if (useRogue) {
      // Emulate a rogue LLM proposing changes to protected ranges
      proposedUpdates = [
        { row: 2, col: 3, value: 5700000 }, // Writable index (forecast cell)
        { row: 4, col: 3, value: 9999999 }, // Protected index (violation)
      ];
      console.log(`${colors.yellow}Simulating rogue AI updates...${colors.reset}`);
    } else {
      proposedUpdates = await callGeminiAPI(systemInstructions, promptText, cellsData);
    }

    console.log(`${colors.green}LLM Maker suggested ${proposedUpdates.length} cell updates.${colors.reset}`);

    // 6. Client-Side Access Verification Firewall
    console.log(`\nRunning Local Verification Firewall...`);
    const verification = verifyUpdates(cellsData, proposedUpdates, protectedRanges);

    if (!verification.success) {
      console.log(`\n${colors.bgRed}${colors.bright} SECURITY FIREWALL BLOCKED WRITE! ${colors.reset}`);
      console.log(`${colors.red}${verification.error}${colors.reset}\n`);
      process.exit(1);
    }

    console.log(`${colors.green}✔ Verification Succeeded: All edits lie within authorized unprotected cells.${colors.reset}`);

    // Print proposed updates
    console.log(`\nProposed changes diff:`);
    proposedUpdates.forEach(update => {
      const cell = cellsData.find(c => c.row === update.row && c.col === update.col);
      console.log(`  Cell ${colors.bright}${cell.address}${colors.reset}: "${colors.red}${cell.value || '(empty)'}${colors.reset}" -> "${colors.green}${update.value}${colors.reset}"`);
    });

    // 7. Write Updates via Sheets API
    console.log(`\nWriting verified updates to Google Sheets...`);

    const valueRanges = proposedUpdates.map(update => {
      const cellAddress = getCellAddress(update.row, update.col);
      return {
        range: `${sheetName}!${cellAddress}`,
        values: [[update.value]]
      };
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: valueRanges
      }
    });

    console.log(`${colors.green}✔ Google Sheet successfully updated!${colors.reset}`);

    // Reload final grid to show results
    console.log(`Reloading grid content...`);
    const finalValuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:Z100`
    });

    const finalRows = finalValuesResponse.data.values || [];
    const finalCells = [];
    for (let r = 0; r < maxRow; r++) {
      for (let c = 0; c < maxCol; c++) {
        const val = finalRows[r]?.[c] !== undefined ? finalRows[r][c] : '';
        const isProtected = isCellProtected(r, c, protectedRanges);
        finalCells.push({
          row: r + 1,
          col: c + 1,
          value: val,
          access: isProtected ? 'readonly' : 'writable',
          address: getCellAddress(r + 1, c + 1)
        });
      }
    }
    printGrid(finalCells, maxRow, maxCol);

  } catch (error) {
    console.error(`\n${colors.red}API Error: ${error.message}${colors.reset}\n`);
    process.exit(1);
  }
}

// --- CORE UTILITIES ---

function parseArgs() {
  const result = {
    help: false,
    prompt: '',
    spreadsheetId: '',
    sheet: 'Sheet1',
    rogue: false,
    status: false
  };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
    } else if (args[i] === '--prompt' || args[i] === '-p') {
      result.prompt = args[++i];
    } else if (args[i] === '--id' || args[i] === '-i') {
      result.spreadsheetId = args[++i];
    } else if (args[i] === '--sheet' || args[i] === '-s') {
      result.sheet = args[++i];
    } else if (args[i] === '--rogue' || args[i] === '-r') {
      result.rogue = true;
    } else if (args[i] === '--status') {
      result.status = true;
    }
  }
  return result;
}

function printHelp() {
  console.log(`Usage: node google-copilot.js [options]`);
  console.log(`Options:`);
  console.log(`  -i, --id <sheet_id>     The Google Spreadsheet ID (from spreadsheet URL).`);
  console.log(`  -p, --prompt <text>     Instructions on how to edit target cells.`);
  console.log(`  -s, --sheet <name>      Name of the sheet tab to target (default: Sheet1).`);
  console.log(`  -r, --rogue             Force simulator to breach locked cells to check firewall.`);
  console.log(`  --status                Check sheet permissions and print cells grid only.`);
  console.log(`  -h, --help              Print this help menu.`);
}

function isCellProtected(row, col, protectedRanges) {
  const rIdx = row; // row is 0-based inside Google sheet metrics (wait! range index in API matches row indices)
  const cIdx = col;

  for (let pr of protectedRanges) {
    const rng = pr.range;
    if (rng) {
      const startRow = rng.startRowIndex !== undefined ? rng.startRowIndex : 0;
      const endRow = rng.endRowIndex !== undefined ? rng.endRowIndex : 1000;
      const startCol = rng.startColumnIndex !== undefined ? rng.startColumnIndex : 0;
      const endCol = rng.endColumnIndex !== undefined ? rng.endColumnIndex : 100;

      if (rIdx >= startRow && rIdx < endRow && cIdx >= startCol && cIdx < endCol) {
        return true;
      }
    }
  }
  return false;
}

function verifyUpdates(cells, proposedUpdates, protectedRanges) {
  for (let update of proposedUpdates) {
    const cell = cells.find(c => c.row === update.row && c.col === update.col);
    if (!cell) {
      return { success: false, error: `Proposed coordinate row ${update.row}, col ${update.col} does not exist.` };
    }

    // Check local properties
    if (cell.access === 'readonly') {
      return {
        success: false,
        error: `Security Violation!\nLLM proposed writing to locked cell ${colors.bright}${cell.address}${colors.reset} which is inside a Protected Range.`
      };
    }

    // Check against active protectedRanges metadata explicitly
    if (isCellProtected(update.row - 1, update.col - 1, protectedRanges)) {
      return {
        success: false,
        error: `Security Firewall Interceptor!\nCell ${colors.bright}${cell.address}${colors.reset} lies within a Google protected range constraint.`
      };
    }

    if (cell.formula) {
      return {
        success: false,
        error: `Formula Override Violation!\nCell ${colors.bright}${cell.address}${colors.reset} contains formula "${cell.formula}".`
      };
    }
  }
  return { success: true };
}

async function callGeminiAPI(systemInstruction, userPrompt, cellsData) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('Environment variable GEMINI_API_KEY must be defined.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payloadPrompt = `User Request: ${userPrompt}\n\nSpreadsheet Cells:\n${JSON.stringify(cellsData, null, 2)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: payloadPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API Error: ${err.error?.message || 'Unknown'}`);
  }

  const result = await response.json();
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from model.');

  text = text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(text);
  return parsed.updates || [];
}

function printGrid(cellsData, rows, cols) {
  console.log(`\nSpreadsheet Active Grid View:`);
  console.log(`---------------------------------------------------------------------------------`);

  let headerStr = "    | ";
  for (let c = 1; c <= cols; c++) {
    headerStr += `${getColLetter(c).padEnd(16)} | `;
  }
  console.log(headerStr);
  console.log(`---------------------------------------------------------------------------------`);

  for (let r = 1; r <= rows; r++) {
    let rowStr = `${r.toString().padEnd(3)} | `;
    for (let c = 1; c <= cols; c++) {
      const cell = cellsData.find(cellObj => cellObj.row === r && cellObj.col === c);
      let val = '';
      let color = colors.reset;

      if (cell) {
        val = cell.value;
        if (cell.access === 'writable') color = colors.green;
        else color = colors.yellow; // protected
      }

      let str = val !== null ? val.toString() : '';
      if (str.length > 16) str = str.substring(0, 13) + '...';

      rowStr += `${color}${str.padEnd(16)}${colors.reset} | `;
    }
    console.log(rowStr);
  }
  console.log(`---------------------------------------------------------------------------------\n`);
}

function getColLetter(colNum) {
  let temp = colNum;
  let letter = "";
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
}

function getCellAddress(row, col) {
  return getColLetter(col) + row;
}
