                                                                                       
  /**                                                                                
   * Automatically watches for edits. If F1 is checked, it triggers the Approval     
Workflow.                                                                            
    */                                                                                
  function onCheckboxClick(e) {                                                               
    // If the edit wasn't on a cell (e.g., formatting), ignore it                    
    if (!e || !e.range) 
    {
      // 2. Alert the user that the process has started                              
        SpreadsheetApp.getActiveSpreadsheet().toast("edit wasn't on a cell", "Ringisho Workflow", 3);
        console.log("Edit event ignored: Not a cell edit.");
      return;                  
    }
                                                                                      
    const sheet = e.range.getSheet();                                                
    const cell = e.range.getA1Notation();                                            
    const value = e.value;                                                           
                                                                                      
    // 1. Check if the exact edit happened on the Ringisho sheet, at cell F1, and was checked (TRUE)                                                                       
    if (sheet.getName() === "Ringisho" && cell === "F1" && value === "TRUE") {       
                                                                                      
      // 2. Alert the user that the process has started                              
        SpreadsheetApp.getActiveSpreadsheet().toast("Submitting to Node.js backend...", "Ringisho Workflow", 3);        
         console.log("Triggering workflow: F1 checked. Starting submission to Node.js backend.");  
                                                                                      
      // 3. Call your Node.js Backend to generate the PDF and upload to MinIO!       
      submitToNodeBackend(sheet);                                                    
                                                                                      
      // 4. (Optional) Uncheck the box automatically so it resets for next time      
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
     * Sends the prompt to the internal company Node.js server.                                                              
     *                                                                                                                       
     * @param {string} prompt The instruction for the AI.                                                                    
     * @param {string} context (Optional) A cell or range to use as context.                                                 
     * @return The AI-generated response.                                                                                    
     * @customfunction                                                                                                       
     */                                                                                                                      
    function COMPANY_AI(prompt, context) {                                                                                   
      // 1. Combine the prompt and the context (if the user highlighted other cells)                                         
      const fullPrompt = context ? `${prompt}\nContext: ${JSON.stringify(context)}` : prompt;                                
                                                                                                                             
      // 2. Point this strictly to your internal company Node.js Proxy/Firewall                                              
      const proxyUrl = 'https://supply-various-paralyze.ngrok-free.dev/api/llm/generate';                                             
                                                                                                                             
      const payload = {                                                                                                      
        user: "dummy_formula_user",                                    
        query: fullPrompt                                                                                                    
      };                                                                                                                     
                                                                                                                             
      const options = {                                                                                                      
        method: 'post',                                                                                                      
        contentType: 'application/json',                                                                                     
        payload: JSON.stringify(payload),                                                                                    
        muteHttpExceptions: true                                                                                             
      };                                                                                                                     
                                                                                                                             
      try {                                                                                                                  
        // 3. The request hits your Node.js server, NOT Google's public Gemini!                                              
        const response = UrlFetchApp.fetch(proxyUrl, options);                                                               
                                                                                                                             
        if (response.getResponseCode() === 200) {                                                                            
          return JSON.parse(response.getContentText()).text;                                                                 
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