import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const originalLog = console.log;
console.log = function (...args) {
    const timestamp = new Date().toISOString();
    originalLog(`[${timestamp}] [DOC-SVC]`, ...args);
};

// ==============================================================
// THE DOCUMENT WORKER ENDPOINT
// ==============================================================
// Revert back to match what Code.js and the API Gateway are sending!
// app.post('/api/workflow/approve', (req, res) => {
app.post('/approve', (req, res) => {
    const { action, user, data } = req.body;
    console.log(`🔔 Approval request received from Gateway! User: ${user}`);

    // Instantly respond to Gateway
    res.status(200).json({ status: "success", message: "PDF generation started" });

    // Kick off the PDF generation script
    console.log(`📄 Kicking off generate_approval_pdf.mjs...`);
    const scriptPath = path.join(__dirname, 'scripts', 'generate_approval_pdf.mjs');
    exec(`node ${scriptPath}`, { cwd: path.resolve(__dirname, '../../') }, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ PDF Generation Failed: ${error.message}`);
            return;
        }
        console.log(`✅ PDF Generation Complete!`);
        console.log(stdout);
        if (stderr) {
            console.error(`⚠️ Script Stderr Output:`);
            console.error(stderr);
        }
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`\n📄 Document Service Worker running on http://localhost:${PORT}\n`);
});
