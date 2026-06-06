# DocAccess: Co-Pilot Maker-Checker Guardrails

An enterprise MVP co-pilot dashboard designed for regulated financial workflows. It demonstrates how to apply a strict **Maker-Checker (Four-Eyes) Principle** directly to AI-driven document and spreadsheet modification loops.

The application offers two distinct modules:
1. **Markdown Editor**: Uses inline HTML comment annotations to establish block-level permissions, featuring a regex-based pre-filter (redacting sensitive context) and post-verification parser (blocking rogue modifications to locked text).
2. **Google Sheets Co-Pilot**: Applies cell background color-coding directly within spreadsheets to declare cell access states (Read-only, Writable, or Hidden), checking formula protection rules before writes are permitted.

---

## Key Security Features

*   🔒 **Read-Only / Locked Zones**: Content serving as background context that the AI is programmatically blocked from altering.
*   ✏️ **Writable Zones**: Authorized text segments or cell ranges open for AI generation.
*   👁️ **Hidden / Redacted Zones**: Sensitive items (e.g., API keys, private transaction notes, PII) that are stripped from the prompt payload locally and replaced with a redacted token *before* sending to the AI model. Original content is restored automatically during merge approval.
*   🛡️ **Output Verification Firewall**: Scans the LLM payload to verify that no read-only content, redacted text, or cell formulas were overwritten or corrupted.

---

## Getting Started

### 1. Installation
Install the project dependencies (specifically, the Vite build system):
```bash
npm install
```

### 2. Run the Development Server
Launch the local Vite server:
```bash
npm run dev
```
Open the printed local URL (usually `http://localhost:5173`) in your web browser.

---

## Google Sheets Integration Setup

To hook this co-pilot directly to a live **Google Sheet**:

1. Open a Google Sheet (free personal account or Workspace account).
2. In the top menu, click **Extensions > Apps Script**.
3. Clear the default code and paste the code from [google_sheets_integration.md](file:///home/vin/.gemini/antigravity-cli/brain/0af082b6-c699-4d6f-abec-2e5d138aa073/google_sheets_integration.md).
4. Click **Save** (disk icon).
5. Click **Deploy > New Deployment** in the top right.
   * **Select type**: Web App.
   * **Description**: DocAccess Gateway.
   * **Execute as**: Me (your-email@gmail.com).
   * **Who has access**: Anyone (this exposes an endpoint for the local dashboard to connect to).
6. Click **Deploy**, authorize permissions, and copy the **Web App URL** provided.
7. Open the **DocAccess** local dashboard, select the **Google Sheets Co-Pilot** tab, paste the Web App URL, and click **Connect & Fetch Sheet**.

### Cell Color-Coding Guidelines
In your sheet, color cells to set permissions:
* **White / No Fill**: Read-Only Context (Input only).
* **Light Green Fill (`#d9ead3`)**: Writable (AI will fill this cell).
* **Light Red Fill (`#f4cccc`)**: Hidden (Data redacted from the AI).
* **Formulas (e.g. `=SUM(...)`)**: Hard-protected automatically by the server script, even if they have a green background.

---

## Testing Verification Safeguards (Bypass API Key)

No Gemini API key is needed to test the safeguards. The dashboard has a built-in local simulator:
1. Open the settings gear (top right).
2. Ensure **Force local simulation mode** is checked.
3. To test a **Verification Failure**, check **Simulate Rogue Maker (Breach Read-Only Limits)** and click **Save**.
4. Run the maker loop. The verifier will flag the security violation and display a detailed report explaining which boundaries were breached.
