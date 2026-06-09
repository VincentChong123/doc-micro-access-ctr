import express from 'express';
import { exec } from 'child_process';
// Ensure .env is loaded
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

const app = express();
app.use(express.json());

// -------------------------------------------------------------
// Global Log Override: Automatically prefix all logs with timestamp
// -------------------------------------------------------------
const originalLog = console.log;
console.log = function (...args) {
    const timestamp = new Date().toISOString(); // e.g., 2026-06-08T12:00:00.000Z
    originalLog(`[${timestamp}]`, ...args);
};
// -------------------------------------------------------------
// This is your mock connection to the active agy-cli session.
// In a real Antigravity SDK implementation, you would pass `query`
// into the Agent's run() method here.
// -------------------------------------------------------------
app.post('/api/llm/generate', async (req, res) => {
    const { user, query } = req.body;
    console.log(`\n🔔 [EXPRESS PROXY] Request received from Google Sheets!`);
    console.log(`👤 User: ${user}`);
    console.log(`💬 Prompt: "${query}"`);

    try {
        console.log(`🤖 Routing prompt to Active Antigravity (agy-cli) Session via IPC...`);

        // 1. Write the request to a file for the Agent to read
        const fs = await import('fs');
        const requestId = Date.now().toString();
        const requestData = { id: requestId, query: query, status: "pending" };
        fs.writeFileSync('./agent_request.json', JSON.stringify(requestData, null, 2));

        console.log(`⏳ Waiting for Antigravity Agent to process request ${requestId}...`);

        // 2. Poll the response file until the Agent writes the answer (Timeout after 25s)
        let agentFinalOutput = "";
        for (let i = 0; i < 25; i++) {
            await new Promise(r => setTimeout(r, 1000)); // Wait 1 second

            if (fs.existsSync('./agent_response.json')) {
                const responseData = JSON.parse(fs.readFileSync('./agent_response.json', 'utf8'));
                // Removed strict ID check for easier MVP testing
                agentFinalOutput = responseData.answer;
                fs.unlinkSync('./agent_response.json'); // Clean up
                fs.unlinkSync('./agent_request.json'); // Clean
                console.log(`📤 Deleted agent_*.json`);
                break;
            }
        }

        if (!agentFinalOutput) {
            agentFinalOutput = "❌ Agent Timeout: Antigravity did not respond within 25 seconds.";
            // Commenting out the deletion so Antigravity can read it after the timeout!
            // if (fs.existsSync('./agent_request.json')) fs.unlinkSync('./agent_request.json');
        }

        console.log(`📤 Sending Agent response back to Google Sheets...`);
        res.status(200).json({ text: agentFinalOutput });

    } catch (error) {
        console.error("❌ Agent Proxy Error:", error);
        res.status(500).json({ text: "Error: Could not process request via Antigravity." });
    }
});

// -------------------------------------------------------------
// Document Workflow: Triggered by Google Sheets "Approve" Checkbox
// -------------------------------------------------------------
app.post('/api/workflow/approve', (req, res) => {
    const { action, user, data } = req.body;
    console.log(`\n🔔 [WORKFLOW] Approval Request received from Google Sheets!`);
    console.log(`👤 Requested by: ${user}`);

    // 1. Instantly respond so Google Sheets doesn't timeout
    res.status(200).json({ status: "success", message: "PDF generation started in background." });

    // 2. Kick off the PDF script asynchronously
    console.log(`📄 Kicking off generate_approval_pdf.mjs...`);
    exec('node ./src/scripts/generate_approval_pdf.mjs', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ PDF Generation Failed: ${error.message}`);
            return;
        }
        console.log(`✅ PDF Generation Complete!`);
        console.log(stdout);
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Express proxy running on http://localhost:${PORT}`);
    console.log(`👉 To expose this to Google Sheets, run: ngrok http ${PORT}`);
});
