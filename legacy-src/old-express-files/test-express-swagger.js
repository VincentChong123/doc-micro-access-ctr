import express from 'express';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

const app = express();
app.use(express.json());

// ==============================================================
// CONTRACT-FIRST API ARCHITECTURE
// Single Source of Truth: The pre-agreed JSON contract
// ==============================================================

// 1. Point to your master contract file
const CONTRACT_PATH = '/home/vin/01-prj/doc-micro-access-ctr/docs/schema_contract/schema_version=2026-06-06/openapi3-ringisho-spec.json';

// 2. Read and parse the JSON file synchronously when the server starts
const openapiContract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));

// 3. Hand the pre-agreed contract directly to Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiContract));

// ==============================================================
// 4. THE ACTUAL ROUTE
// (The developers write this logic to strictly obey the contract above)
// ==============================================================
app.post('/api/workflow/approve', (req, res) => {
    console.log("🔔 Approval request received!");
    res.json({ status: "success", message: "PDF generation started based on contract spec" });
});

// 5. Start the server
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`\n🚀 Contract-First API Server running on http://localhost:${PORT}`);
    console.log(`👉 View the official Business Contract at: http://localhost:${PORT}/docs\n`);
});
