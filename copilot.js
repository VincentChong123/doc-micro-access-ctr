#!/usr/bin/env node

/**
 * DocAccess: Google Sheets CLI Co-Pilot
 * Connects directly to Google Sheets Apps Script Web App, compiles LLM prompt
 * using system.md, calls Gemini, verifies permissions, and applies updates.
 */

const fs = require('fs');
const path = require('path');

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

// --- MOCK OFFLINE DATA ---
const MOCK_SHEET_DATA = {
  sheetName: "Digital Budget 2026 (Mock)",
  dimensions: { rows: 6, cols: 4 },
  cells: [
    { row: 1, col: 1, value: "Category", formula: null, access: "readonly", address: "A1" },
    { row: 1, col: 2, value: "Current Budget (USD)", formula: null, access: "readonly", address: "B1" },
    { row: 1, col: 3, value: "LLM Revised Forecast (USD)", formula: null, access: "readonly", address: "C1" },
    { row: 1, col: 4, value: "Audit Notes", formula: null, access: "readonly", address: "D1" },

    { row: 2, col: 1, value: "Strategic VC Investments", formula: null, access: "readonly", address: "A2" },
    { row: 2, col: 2, value: 5000000, formula: null, access: "readonly", address: "B2" },
    { row: 2, col: 3, value: "", formula: null, access: "writable", address: "C2" },
    { row: 2, col: 4, value: "Evaluate Series B targets", formula: null, access: "readonly", address: "D2" },

    { row: 3, col: 1, value: "Fintech Innovation Alliances", formula: null, access: "readonly", address: "A3" },
    { row: 3, col: 2, value: 2500000, formula: null, access: "readonly", address: "B3" },
    { row: 3, col: 3, value: "", formula: null, access: "writable", address: "C3" },
    { row: 3, col: 4, value: "Partnerships with local startups", formula: null, access: "readonly", address: "D3" },

    { row: 4, col: 1, value: "Regulatory Audit (MAS Tech)", formula: null, access: "readonly", address: "A4" },
    { row: 4, col: 2, value: 750000, formula: null, access: "readonly", address: "B4" },
    { row: 4, col: 3, value: 750000, formula: null, access: "readonly", address: "C4" },
    { row: 4, col: 4, value: "Fixed MAS statutory assessment fee", formula: null, access: "readonly", address: "D4" },

    { row: 5, col: 1, value: "API Vault Secret Key", formula: null, access: "readonly", address: "A5" },
    { row: 5, col: 2, value: "mufg-sec-key-88992-abc", formula: null, access: "hidden", address: "B5" },
    { row: 5, col: 3, value: "[REDACTED - HIDDEN DATA]", formula: null, access: "hidden", address: "C5" },
    { row: 5, col: 4, value: "Credentials for Sandbox API connections", formula: null, access: "readonly", address: "D5" },

    { row: 6, col: 1, value: "Total Digital Budget", formula: null, access: "readonly", address: "A6" },
    { row: 6, col: 2, value: 8250000, formula: "=SUM(B2:B4)", access: "readonly", address: "B6" },
    { row: 6, col: 3, value: 750000, formula: "=SUM(C2:C4)", access: "readonly", address: "C6" },
    { row: 6, col: 4, value: "Formula sum automatically calculated", formula: null, access: "readonly", address: "D6" }
  ]
};

// --- PARSE ARGUMENTS ---
const args = parseArgs();

if (args.help) {
  printHelp();
  process.exit(0);
}

const promptText = args.prompt || '';
const webAppUrl = args.url || '';
const useSimulation = args.simulate || !webAppUrl;
const useRogue = args.rogue || false;

if (!promptText && !args.status) {
  console.log(`${colors.red}Error: Please specify edit instructions using --prompt or -p.${colors.reset}`);
  printHelp();
  process.exit(1);
}

main();

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}===============================================`);
  console.log(`         DocAccess Google Sheets Co-Pilot        `);
  console.log(`===============================================${colors.reset}\n`);

  try {
    // 1. Fetch spreadsheet content
    let sheetData;
    if (useSimulation) {
      console.log(`${colors.yellow}Mode: OFFLINE SIMULATION${colors.reset}`);
      sheetData = JSON.parse(JSON.stringify(MOCK_SHEET_DATA));
      await delay(500);
    } else {
      console.log(`${colors.yellow}Mode: LIVE APPS SCRIPT GATEWAY${colors.reset}`);
      console.log(`Connecting to: ${colors.dim}${webAppUrl}${colors.reset}...`);
      sheetData = await fetchSheetFromAppsScript(webAppUrl);
    }

    console.log(`Connected to Sheet: ${colors.bright}${sheetData.sheetName}${colors.reset}`);
    console.log(`Dimensions: ${sheetData.dimensions.rows} rows x ${sheetData.dimensions.cols} columns`);

    // Print current grid layout
    printGrid(sheetData);

    if (args.status) {
      // If user just wanted to check status/load sheet, exit here
      process.exit(0);
    }

    // 2. Read LLM System Instructions from system.md
    const systemMdPath = path.join(__dirname, 'system.md');
    if (!fs.existsSync(systemMdPath)) {
      throw new Error('system.md not found in workspace. Run inside workspace directory.');
    }
    const systemInstructions = fs.readFileSync(systemMdPath, 'utf8');

    // 3. Compile prompt and redact hidden content
    const compiledCells = sheetData.cells.map(c => {
      let val = c.value;
      if (c.access === 'hidden') val = '[REDACTED]';
      return {
        address: c.address,
        row: c.row,
        col: c.col,
        access: c.access,
        value: val,
        hasFormula: !!c.formula
      };
    });

    console.log(`\nCompiling security boundaries...`);
    const writableCount = compiledCells.filter(c => c.access === 'writable').length;
    const redactedCount = compiledCells.filter(c => c.access === 'hidden').length;
    console.log(`- ${colors.green}${writableCount} cells marked as Writable${colors.reset}`);
    console.log(`- ${colors.yellow}${redactedCount} cells Redacted locally (Hidden)${colors.reset}`);
    console.log(`- Remaining cells protected (Read-Only)`);

    // 4. Invoke LLM (Gemini or Simulated)
    console.log(`\nCalling LLM Maker...`);
    let proposedUpdates = [];

    if (useSimulation) {
      await delay(1200);
      proposedUpdates = simulateLLMUpdates(compiledCells, promptText, useRogue);
    } else {
      proposedUpdates = await callGeminiAPI(systemInstructions, promptText, compiledCells);
    }

    console.log(`${colors.green}LLM response received. Received ${proposedUpdates.length} proposed cell updates.${colors.reset}`);

    // 5. Client-Side Verification Guardrail
    console.log(`\nRunning Local Verification Safeguards...`);
    const verification = verifyUpdates(sheetData.cells, proposedUpdates);

    if (!verification.success) {
      console.log(`\n${colors.bgRed}${colors.bright} SECURITY FIREWALL BLOCKED WRITE! ${colors.reset}`);
      console.log(`${colors.red}${verification.error}${colors.reset}\n`);
      process.exit(1);
    }

    console.log(`${colors.green}✔ Verification Succeeded: All proposed updates conform to permissions.${colors.reset}`);

    // Print proposed diff
    console.log(`\nProposed Changes Summary:`);
    proposedUpdates.forEach(update => {
      const cell = sheetData.cells.find(c => c.row === update.row && c.col === update.col);
      console.log(`  Cell ${colors.bright}${cell.address}${colors.reset}: "${colors.red}${cell.value || '(empty)'}${colors.reset}" -> "${colors.green}${update.value}${colors.reset}"`);
    });

    // 6. Apply updates
    console.log(`\nApplying updates...`);
    if (useSimulation) {
      await delay(500);
      proposedUpdates.forEach(update => {
        const cell = sheetData.cells.find(c => c.row === update.row && c.col === update.col);
        if (cell) cell.value = update.value;
      });
      // Recalculate totals
      recalculateTotals(sheetData);
      console.log(`${colors.green}✔ Local mock sheet updated and formulas updated successfully!${colors.reset}`);
      printGrid(sheetData);
    } else {
      const result = await pushUpdatesToAppsScript(webAppUrl, proposedUpdates);
      console.log(`${colors.green}✔ Google Sheet Gateway Response: ${result.message}${colors.reset}`);

      // Reload final grid
      console.log(`Reloading spreadsheet data...`);
      const finalData = await fetchSheetFromAppsScript(webAppUrl);
      printGrid(finalData);
    }

  } catch (error) {
    console.error(`\n${colors.red}Execution Error: ${error.message}${colors.reset}\n`);
  }
}

// --- HELPER FUNCTIONS ---

function parseArgs() {
  const result = {
    help: false,
    prompt: '',
    url: '',
    simulate: false,
    rogue: false,
    status: false
  };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
    } else if (args[i] === '--prompt' || args[i] === '-p') {
      result.prompt = args[++i];
    } else if (args[i] === '--url' || args[i] === '-u') {
      result.url = args[++i];
    } else if (args[i] === '--simulate' || args[i] === '-s') {
      result.simulate = true;
    } else if (args[i] === '--rogue' || args[i] === '-r') {
      result.rogue = true;
    } else if (args[i] === '--status') {
      result.status = true;
    }
  }
  return result;
}

function printHelp() {
  console.log(`Usage: node copilot.js [options]`);
  console.log(`Options:`);
  console.log(`  -p, --prompt <text>     Instructions on how to edit the writable cells.`);
  console.log(`  -u, --url <url>         The Google Apps Script Web App deployed endpoint URL.`);
  console.log(`  -s, --simulate          Force offline mock simulation mode (ignores live API).`);
  console.log(`  -r, --rogue             Force simulator to breach read-only/formula bounds to test safeguards.`);
  console.log(`  --status                Fetch the sheet state and display grid metadata only.`);
  console.log(`  -h, --help              Print this help menu.`);
  console.log(`\nExample:`);
  console.log(`  node copilot.js -u "https://script.google.com/.../exec" -p "Update 2026 forecast and add notes"`);
}

async function fetchSheetFromAppsScript(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP fetch failed with code ${response.status}`);
  }
  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(`Apps Script Error: ${result.message}`);
  }
  return result;
}

async function pushUpdatesToAppsScript(url, updates) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/plain-text'
    },
    body: JSON.stringify({ updates: updates })
  });
  if (!response.ok) {
    throw new Error(`HTTP push failed with code ${response.status}`);
  }
  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(`Apps Script Gateway write blocked: ${result.message}`);
  }
  return result;
}

function verifyUpdates(cells, proposedUpdates) {
  for (let update of proposedUpdates) {
    const cell = cells.find(c => c.row === update.row && c.col === update.col);
    if (!cell) {
      return { success: false, error: `Proposed update target row ${update.row}, col ${update.col} does not exist in spreadsheet layout.` };
    }

    // Check permission
    if (cell.access !== 'writable') {
      return {
        success: false,
        error: `Security Violation!\nAttempted to edit non-writable cell ${colors.bright}${cell.address}${colors.reset} which is marked as '${cell.access.toUpperCase()}'.`
      };
    }

    // Check formula
    if (cell.formula) {
      return {
        success: false,
        error: `Formula Safe-Lock Violation!\nAttempted to overwrite cell ${colors.bright}${cell.address}${colors.reset} containing formula "${cell.formula}".`
      };
    }
  }
  return { success: true };
}

function simulateLLMUpdates(compiledCells, promptText, rogue = false) {
  if (rogue) {
    // Proposes valid writable edits + rogue edits to read-only/formulas
    return [
      { row: 2, col: 3, value: 5600000 }, // Writable (OK)
      { row: 4, col: 3, value: 9900000 },  // Read-only (violation!)
      { row: 6, col: 3, value: 1200000 }   // Formula cell (violation!)
    ];
  }

  // Normal compliant edits
  const updates = [];
  const cellC2 = compiledCells.find(c => c.row === 2 && c.col === 3);
  const cellC3 = compiledCells.find(c => c.row === 3 && c.col === 3);

  if (cellC2 && cellC2.access === 'writable') {
    updates.push({ row: 2, col: 3, value: 5500000 });
  }
  if (cellC3 && cellC3.access === 'writable') {
    updates.push({ row: 3, col: 3, value: 2750000 });
  }

  return updates;
}

async function callGeminiAPI(systemInstruction, userPrompt, cellsData) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('Environment variable GEMINI_API_KEY is not defined. Set it before running or use -s for simulation.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payloadPrompt = `User Request: ${userPrompt}\n\nSpreadsheet Cells:\n${JSON.stringify(cellsData, null, 2)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: payloadPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    })
  });

  if (!response.ok) {
    const errorJson = await response.json();
    throw new Error(`Gemini API Call Failed: ${errorJson.error?.message || 'Unknown'}`);
  }

  const result = await response.json();
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty text returned from Gemini API.');
  }

  // Clean JSON block comments if present
  text = text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(text);
    return parsed.updates || [];
  } catch (e) {
    throw new Error(`Failed to parse LLM response JSON structure. Response text:\n${text}`);
  }
}

function printGrid(sheetData) {
  const rows = sheetData.dimensions.rows;
  const cols = sheetData.dimensions.cols;

  console.log(`\nSpreadsheet Grid Layout View:`);
  console.log(`---------------------------------------------------------------------------------`);

  // Header cols labels
  let headerStr = "    | ";
  for (let c = 1; c <= cols; c++) {
    headerStr += `${getColLetter(c).padEnd(16)} | `;
  }
  console.log(headerStr);
  console.log(`---------------------------------------------------------------------------------`);

  for (let r = 1; r <= rows; r++) {
    let rowStr = `${r.toString().padEnd(3)} | `;
    for (let c = 1; c <= cols; c++) {
      const cell = sheetData.cells.find(cellObj => cellObj.row === r && cellObj.col === c);
      let val = '';
      let formatColor = colors.reset;

      if (cell) {
        val = cell.value;
        if (cell.access === 'writable') formatColor = colors.green;
        else if (cell.access === 'hidden') formatColor = colors.yellow;
        else if (cell.formula) formatColor = colors.blue;
      }

      let stringVal = val !== null ? val.toString() : '';
      if (stringVal.length > 16) stringVal = stringVal.substring(0, 13) + '...';

      rowStr += `${formatColor}${stringVal.padEnd(16)}${colors.reset} | `;
    }
    console.log(rowStr);
  }
  console.log(`---------------------------------------------------------------------------------\n`);
}

function recalculateTotals(sheetData) {
  // Sum forecast columns (Row 2, 3, 4 of Col 3)
  let sum = 0;
  for (let r = 2; r <= 4; r++) {
    const cell = sheetData.cells.find(c => c.row === r && c.col === 3);
    if (cell && cell.value) sum += parseFloat(cell.value) || 0;
  }

  const totalCell = sheetData.cells.find(c => c.row === 6 && c.col === 3);
  if (totalCell) totalCell.value = sum;
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
