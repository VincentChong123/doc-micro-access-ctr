# Executive Pitch: Secure Spreadsheet Co-Pilot Gateway

**Target Audience**: Mr. Yip (Managing Director, Head of Asia Digital Strategy, MUFG)
**Proposed Concept**: Zero-Trust, API-Decoupled Maker-Checker Spreadsheet Co-Pilot
**Pillars**: Data Security, Cost Rationalization, Operational Efficiency, User Friction, and Scalability.

---

## Pillar 1: Data Sovereignty & Secrecy (FEAT)
*   **The Pitch**: *"We do not leak spreadsheet content to public model providers. Instead of sending the full sheet, our gateway executes a **local pre-redaction filter** inside our secure boundary. Sensitive customer records, transaction details, or internal keys are stripped and replaced with `[REDACTED]` tokens. The LLM only receives context, ensuring compliance with MAS v2.0 Technology Risk Management and banking secrecy laws."*

## Pillar 2: Commercial Scalability (Cost)
*   **The Pitch**: *"Traditional AI assistants cost $30 to $90 per seat per month. For a partner bank with 5,000 employees, this represents a major licensing tax. Our MVP decouples the AI model. Because the human checkers use standard Excel, we **only pay for the central agent service account API usage (pay-per-token)**. We can support an entire department with a single API gateway license, reducing licensing overhead by over 90%."*

## Pillar 3: Operational Integrity (Efficiency)
*   **The Pitch**: *"In banking, spreadsheets contain complex, audited formulas. We cannot let an AI autonomously rewrite or corrupt these formulas. Our workflow programmatically enforces that **once a worksheet section is verified, it is locked from editing**. The AI can propose changes in the designated writable cells, but any attempt to alter verified headers or formulas is physically blocked at the API gateway."*

## Pillar 4: Zero-Trust Security (Enforced via Cloud IAM)
*   **The Pitch**: *"We do not rely on soft prompt engineering ('Please don't edit column B') to protect data. Security is enforced natively. By sharing the sheet with `llm-agent@krungsri.com` under **Least-Privilege Range Protections**, Google Sheets or Microsoft Excel cloud servers act as the physical firewall. If the LLM proposes an unauthorized cell write, the API returns a hard `403 Forbidden` error."*

## Pillar 5: Zero-Friction User Experience (Low Friction)
*   **The Pitch**: *"We introduce zero new tools. Front-office traders and credit analysts continue working in their familiar spreadsheet environment, setting permissions using standard cell locks and background colors. They interact with the agent using **Antigravity CLI / Chatbot interface**, providing a simple, conversational ChatGPT-like interface they are already familiar with."*

---

## Pillar 6: Banking & Consulting Accents (Strategic Value-Add)

### A. Swappable LLM Models (No Vendor Lock-in)
*   **The Value**: *"By routing edits through our local gateway, we are not locked into Microsoft or Google. We can swap the underlying model (Gemini, Claude, or local private LLMs) behind the API without changing a single cell in the front-office worksheets."*

### B. Scalability for Emerging ASEAN Partner Banks
*   **The Value**: *"MUFG's partner banks in the region (Krungsri, Danamon) have varying IT budgets and security maturity. A heavy enterprise software roll-out takes years of security reviews. This lightweight gateway integrates with their existing Office 365 cloud subscriptions, allowing instant enablement at minimal friction."*

### C. Compliance-Ready Audit Trail
*   **The Value**: *"Every change made by the AI is logged under the `llm-agent` account in the spreadsheet's native version history. Internal audit has a clear, immutable record of what the AI wrote, and what the human checker verified."*
