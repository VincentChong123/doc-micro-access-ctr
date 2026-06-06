# Google Sheets Integration: Maker-Checker AI Loop

This guide details how to implement the Access Control Co-pilot directly in **Google Sheets**. Front-office finance teams can use cell background colors to define cell permissions, ensuring the LLM (Maker) reads only approved context and never modifies protected financial models.

---

## 1. Visual Permission Mapping in Sheets

Instead of typing text comments, users use standard cell fills (background colors) to classify cell permissions:

| Cell Fill Color | HEX Code (Standard) | Permission Level | Role in the LLM Loop |
| :--- | :--- | :--- | :--- |
| **No Fill / White** | `#ffffff` | **Read-Only (Context)** | The LLM receives this cell value as input/context. It cannot change it. |
| **Light Green** | `#d9ead3` | **Writable (Editable)** | The LLM is authorized to overwrite this cell or fill it with generated values. |
| **Light Red** | `#f4cccc` | **Hidden (Redacted)** | The script replaces the cell content with `[REDACTED]` before sending it to the LLM. |

---

## 2. Google Apps Script Code (`Code.gs`)

Paste this code into your Google Sheets Script Editor (**Extensions > Apps Script**), then click **Deploy > New Deployment** as a **Web App** (Set *Execute as:* "Me" and *Who has access:* "Anyone").

```javascript
/**
 * DocAccess Spreadsheet Gatekeeper API
 * Exposes GET to read sheet data (redacted) and POST to verify/apply updates.
 */

// Colors used for classifications
const COLOR_WRITABLE = '#d9ead3'; // Light Green
const COLOR_HIDDEN   = '#f4cccc'; // Light Red

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const range = sheet.getDataRange();
    const values = range.getValues();
    const backgrounds = range.getBackgrounds();
    const formulas = range.getFormulas();

    const rows = range.getNumRows();
    const cols = range.getNumColumns();

    const cellsData = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bg = backgrounds[r][c];
        const val = values[r][c];
        const formula = formulas[r][c];

        let access = 'readonly';
        let outputVal = val;

        if (bg === COLOR_WRITABLE) {
          access = 'writable';
        } else if (bg === COLOR_HIDDEN) {
          access = 'hidden';
          outputVal = '[REDACTED - HIDDEN DATA]';
        }

        cellsData.push({
          row: r + 1,
          col: c + 1,
          value: outputVal,
          formula: formula || null,
          access: access,
          address: getCellAddress(r + 1, c + 1)
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      sheetName: sheet.getName(),
      dimensions: { rows, cols },
      cells: cellsData
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const proposedUpdates = postData.updates; // Array of {row, col, value}

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const range = sheet.getDataRange();
    const backgrounds = range.getBackgrounds();
    const formulas = range.getFormulas();
    const originalValues = range.getValues();

    // Server-side Verification
    for (let update of proposedUpdates) {
      const r = update.row - 1;
      const c = update.col - 1;

      // 1. Boundary Check
      if (r < 0 || r >= backgrounds.length || c < 0 || c >= backgrounds[0].length) {
        return createErrorResponse(`Index out of bounds: Row ${update.row}, Col ${update.col}`);
      }

      const bg = backgrounds[r][c];

      // 2. Permission Check: Must be Green
      if (bg !== COLOR_WRITABLE) {
        return createErrorResponse(
          `Security violation: Attempted to edit cells outside writable range at ${getCellAddress(update.row, update.col)} (Status: Read-only/Hidden)`
        );
      }

      // 3. Formula Check: Never overwrite formulas
      if (formulas[r][c]) {
        return createErrorResponse(
          `Formula protection violation: Attempted to overwrite formula at ${getCellAddress(update.row, update.col)}`
        );
      }
    }

    // If verification passes, apply changes
    for (let update of proposedUpdates) {
      const r = update.row;
      const c = update.col;
      sheet.getRange(r, c).setValue(update.value);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: `${proposedUpdates.length} cells programmatically verified and updated.`
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

function createErrorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: msg
  })).setMimeType(ContentService.MimeType.JSON);
}

function getCellAddress(row, col) {
  let address = "";
  let temp = col;
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    address = String.fromCharCode(65 + modulo) + address;
    temp = Math.floor((temp - modulo) / 26);
  }
  return address + row;
}
```

---

## 3. Local Dashboard Integration (The "Maker-Checker" UI)

To use this loop in your project, we will write a local web client.

1. **Connect**: Input the Google Web App URL in your local web panel.
2. **Retrieve**: The client fetches the cell grid via the Web App.
3. **Render**: The dashboard shows a preview of the sheet, color-coding the cells in green, red, or white.
4. **Instruct & Call API**: You write your instructions (e.g., *"Calculate the average valuation inside the green totals cell"*). The client compiles the prompt, redacts the red cells, asks Gemini for updates to green cells, runs verification, and posts changes back to Google Sheets.
