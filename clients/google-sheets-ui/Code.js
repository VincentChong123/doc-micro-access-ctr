
/**
 * A lightweight, Zero-Trust Masking Engine for Google Apps Script
 */
const PrivacyEngine = {

    // 1. Define the sensitive patterns LOB wants to hide
    rules: {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    ACCOUNT: /\b\d{9,12}\b/g // Assuming corporate accounts are 9-12 digits
    },

    // 2. The Masking Function (Run BEFORE sending to IT)
    mask: function(text) {
    let vault = {}; // This dictionary NEVER leaves Google Sheets
    let maskedText = text;
    let counter = 1;

    for (let [type, regex] of Object.entries(this.rules)) {
        maskedText = maskedText.replace(regex, (match) => {
        let token = `[${type}_${counter++}]`;
        vault[token] = match; // Store the real data in the local vault
        return token;
        });
    }

    return { safeText: maskedText, vault: vault };
    },

    // 3. The Re-hydration Function (Run AFTER receiving from IT)
    rehydrate: function(safeResponse, vault) {
    let hydratedText = safeResponse;

    // Swap the tokens back to the real data
    for (let [token, realData] of Object.entries(vault)) {
        // Use split/join to replace all occurrences of the token
        hydratedText = hydratedText.split(token).join(realData);
    }

    return hydratedText;
    }
};

  /**
   * Automatically watches for edits. If F1 is checked, it triggers the Approval
Workflow.
    */
  function onCheckboxClick(e) {
    // If the edit wasn't on a cell (e.g., formatting), ignore it
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    const cell = e.range.getA1Notation();
    const value = e.value;

    // ====================================================================
    // 1. AUTHENTICATION WORKFLOW: Capture Email via Checkbox Click
    // ====================================================================
    if (sheet.getName() === "get_user_email_address" && cell === "B1" && value === "TRUE") {
      // Because this is triggered by a physical human click, it has permission to read identity!
      const userEmail = e.user ? e.user.getEmail() : Session.getActiveUser().getEmail();

      if (userEmail) {
        // Save the email securely to the User's private Google Account memory
        PropertiesService.getUserProperties().setProperty("AI_BILLING_EMAIL", userEmail);

        // Give them a success message and uncheck the box for the next person
        sheet.getRange("C1").setValue(`✅ Authenticated as: ${userEmail}`);
        e.range.uncheck();
        SpreadsheetApp.getActiveSpreadsheet().toast(`Identity secured: ${userEmail}`, "Authentication Success");
      } else {
        SpreadsheetApp.getActiveSpreadsheet().toast("Failed to get email. Corporate Workspace required.", "Error");
        e.range.uncheck();
      }
      return; // Stop execution here
    }

    // ====================================================================
    // 2. RINGISHO WORKFLOW: Trigger Node.js Backend
    // ====================================================================
    if (sheet.getName() === "Ringisho" && cell === "F1" && value === "TRUE") {
      SpreadsheetApp.getActiveSpreadsheet().toast("Submitting to Node.js backend...", "Ringisho Workflow", 3);
      console.log("Triggering workflow: F1 checked. Starting submission to Node.js backend.");
      submitToNodeBackend(sheet);
      sheet.getRange("F1").uncheck();
    }
  }

  function submitToNodeBackend(sheet) {
    // Grab all the data from the sheet to send to Node.js
    const allData = sheet.getDataRange().getValues();
    // const userEmail = Session.getActiveUser().getEmail();

    const payload = {
      action: "submit_for_approval",
      user: "anonymouse_user",
      data: allData
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

      SpreadsheetApp.getActiveSpreadsheet().toast("completed playload");
    console.log("Payload prepared, attempting to submit to Node.js backend...");

    try {
        SpreadsheetApp.getActiveSpreadsheet().toast("try fetching");
      console.log("Attempting to reach Node.js backend at https://supply-various-paralyze.ngrok-free.dev/api/workflow/approve");
      // Replace with your Node.js Ngrok URL!
      UrlFetchApp.fetch("https://supply-various-paralyze.ngrok-free.dev/api/workflow/approve", options);
    SpreadsheetApp.getActiveSpreadsheet().toast("✅ Successfully submitted to Kacho!", "Success");
      console.log("✅ Successfully submitted workflow to Node.js backend!");
    } catch (error) {
      console.log("❌ CRITICAL ERROR: " + error.message);
      SpreadsheetApp.getActiveSpreadsheet().toast("❌ Failed to reach backend.",
"Error");
    }
  }


/*
 * ************ */

/**
 * Corporate AI Proxy for Google Sheets.
 * Uses Zero-Trust Masking to scrub PII locally before sending to IT.
 *
 * @param {string} prompt The instruction for the AI.
 * @param {string} context (Optional) A cell or range to use as context.
 * @return The AI-generated response.
 * @customfunction
 */
function COMPANY_AI(prompt, context) {
  // ========================================================
  // 1. USER IDENTITY (From Secure Storage)
  // ========================================================
  // Because formulas are blocked from reading identity, we read the memory
  // saved by the Checkbox click!
  const userEmail = PropertiesService.getUserProperties().getProperty("AI_BILLING_EMAIL");

  if (!userEmail) {
    // Gracefully fail and instruct the user on exactly how to authenticate
    return `❌ Auth Required: Please tick the checkbox at 'get_user_email_address!B1' to authenticate.`;
  }

  // ========================================================
  // 2. CLIENT-SIDE PII MASKING (ZERO TRUST)
  // ========================================================
  const contextString = context ? JSON.stringify(context) : "";

  // Mask the prompt and context locally
  const maskedPrompt = PrivacyEngine.mask(prompt);
  const maskedContext = PrivacyEngine.mask(contextString);

  // Merge the vaults so we can rehydrate everything later
  const mergedVault = { ...maskedPrompt.vault, ...maskedContext.vault };

  // ========================================================
  // 3. SECURE API CALL TO PYTHON BACKEND
  // ========================================================
  const proxyUrl = 'https://supply-various-paralyze.ngrok-free.dev/api/ai/v1/sheet-chat';

  const payload = {
    prompt: maskedPrompt.safeText,
    context: maskedContext.safeText,
    user: userEmail
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(proxyUrl, options);
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());

      // LLMOps Trace
      console.log(`[LLMOps Trace] Run ID: ${json.meta.run_id}`);
      console.log(`[LLMOps Trace] Latency: ${json.meta.latency_ms}ms | Model: ${json.meta.model_invoked}`);

      // ========================================================
      // 4. CLIENT-SIDE PII RE-HYDRATION
      // ========================================================
      const finalSafeAnswer = PrivacyEngine.rehydrate(json.result, mergedVault);
      return finalSafeAnswer;

    } else {
      return "❌ Proxy Error: " + response.getContentText();
    }
  } catch (e) {
    return "❌ Connection Failed: Could not reach internal proxy.";
  }
}

function forceAuth() {
  UrlFetchApp.fetch("https://www.google.com");
}

function updateSchemaMetadataFromGithub() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Define the RAW GitHub URL for the JSON contract
  // (We use raw.githubusercontent.com to get the pure JSON file, not the GitHub web page)
  var githubRawUrl = "https://raw.githubusercontent.com/VincentChong123/doc-micro-access-ctr/main/docs/schema_contract/schema_version%3D2026-06-06/openapi3-ringisho-spec.json";

  try {
    // 2. Fetch the JSON Contract from GitHub
    Logger.log("Fetching schema from GitHub...");
    var response = UrlFetchApp.fetch(githubRawUrl);
    var jsonText = response.getContentText();
    var schemaContract = JSON.parse(jsonText);

    // Extract the version directly from the OpenAPI 'info' block
    var schemaVersion = schemaContract.info.version;
    Logger.log("Successfully parsed schema version: " + schemaVersion);

    // 3. Find and Delete the old metadata (to prevent duplicates)
    var existingMetadata = sheet.getDeveloperMetadata();
    for (var i = 0; i < existingMetadata.length; i++) {
      var key = existingMetadata[i].getKey();
      if (key === "schema_version" || key === "schema_url") {
        existingMetadata[i].remove();
        Logger.log("Removed old metadata key: " + key);
      }
    }
      sheet.addDeveloperMetadata("schema_version", schemaVersion, SpreadsheetApp.
  DeveloperMetadataVisibility.DOCUMENT);
        sheet.addDeveloperMetadata("schema_url", githubRawUrl, SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);

        Logger.log("✅ Successfully updated Spreadsheet Metadata with GitHub Contract!");
        Logger.log("🔗 Embedded URL: " + githubRawUrl);

        // 2. Read the metadata back to verify it was saved
        Logger.log("--- Verifying Saved Metadata ---");
        var savedMetadata = sheet.getDeveloperMetadata();

        for (var i = 0; i < savedMetadata.length; i++) {
          var key = savedMetadata[i].getKey();
          var value = savedMetadata[i].getValue();
          Logger.log("Found Key: [" + key + "] -> Value: [" + value + "]");
        }
        Logger.log("--------------------------------");

  } catch (error) {
    Logger.log("Error updating schema: " + error.message);
    SpreadsheetApp.getUi().alert("Error: " + error.message);
  }
}
