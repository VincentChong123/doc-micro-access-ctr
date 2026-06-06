# Interview Preparation Guide: Spreadsheet AI Co-Pilot Gateway
**Prepared for**: AVP Business Transformation Interview (Digital Strategy Division, MUFG APAC)
**Primary Focus**: Demonstration of **REQ_5** (Translating Business Needs into Digital Solutions) and **REQ_4** (Safe/Responsible AI).

---

## 1. Defining the Business Problem & User Persona

### A. The User Persona: The Frustrated Human Checker
*   **Role**: Senior Finance Risk Officer, Director of Operations, or Business Analyst at an APAC branch.
*   **Behavior**: Wants to leverage Generative AI (LLMs) to automate monthly Excel-based reporting, data consolidation, and credit forecasting.
*   **The Core Frustration**: LLMs are non-deterministic. Every time the analyst asks the AI to edit the sheet, the LLM alters already checked, verified columns, overrides complex interest rate calculation formulas, or breaks layout formats. The checker spends more time auditing and correcting the LLM's errors than it would take to write the sheet manually.

### B. The Compliance Pain Points (ASEAN Regulatory Risks)
*   **Data Residency & leakage (PII)**: Regulators in Thailand (BOT) and Indonesia (OJK) mandate that customer personal data must not leave local servers. Sending raw client ledger sheets to cloud LLM API endpoints represents a major regulatory breach.
*   **Model Corruption**: Financial sheets contain audited formulas. A single overwritten cell in a circular reference can lead to false credit scores or balance sheet errors, resulting in severe financial loss.

---

## 2. Translating Requirements to Digital Solutions (REQ_5 Mastery)

As an AVP, you must explain how you mapped these front-office business constraints to a high-security software architecture:

| Business/User Requirement | Translated Technical Architecture Solution |
| :--- | :--- |
| **"I want to protect my verified columns and formulas from LLM edits."** | **Cloud-Enforced Range Exception Locks**: We lock the Excel sheet Online and create range exceptions (Allow Edit Ranges) for the LLM user account (`llm-agent@krungsri.com`). The API gateway checks cell edits against these ranges; any attempt to write outside allowed cells returns a `403 Access Denied` error from the Microsoft/Google cloud server. |
| **"We cannot leak sensitive customer details or keys to external APIs."** | **Local API Pre-Redaction Engine**: The local runner script scans the spreadsheet cells, identifies sensitive ranges (flagged by headers or background colors), and redacts their values (replacing them with `[REDACTED]`) *before* compiling the prompt payload. |
| **"We use complex macro-enabled sheets; the AI must not break them."** | **Graph API Cloud Memory Writes**: Standard Python writers rewrite sheet files, stripping out VBA projects. Our gateway uses REST API endpoints (Microsoft Graph API) to modify cells in cloud memory, leaving the macro binary (`vbaProject.bin`) untouched. |
| **"The system must be audit-ready and easily reversible if the AI makes an error."** | **Native SharePoint/OneDrive Version History**: All edits are committed under the unique service account ID. The checker can review changes and revert the spreadsheet to the pre-run version with a single click in SharePoint. |
| **"My team refuses to learn complex new AI software interfaces."** | **Excel Visual Interface + Chatbot CLI**: The checker continues using Excel/Sheets natively. They define permissions using standard sheet protection tools and trigger updates via a familiar chat terminal (Antigravity). |

---

## 3. The Commercial & Strategic Case (The Pitch to Mr. Yip)

Use these three key value propositions to pitch the business value to Yip:

### A. The Cost Angle (SaaS Tax Avoidance)
*   **The Concept**: Horizontal AI tools require seat licenses ($30-$90/user/month) for every employee.
*   **The Pitch**: *"Mr. Yip, by decoupling the LLM via an API gateway, the human checkers run standard Excel. We only pay for the centralized API service account tokens. This **reduces licensing costs by over 90%** ($29,000/year for 1,000 users vs. $360,000/year for Copilot seats)."*

### B. Zero-Trust Security vs. Prompt Guidelines
*   **The Concept**: Banks cannot trust prompt engineering as a security control.
*   **The Pitch**: *"Prompts are vulnerable to model drift and injection. Our solution uses a **Hard Security Wall**. The write boundaries are checked programmatically and enforced by Google/Microsoft cloud servers. Security is handled at the network level, not in the prompt."*

### C. Scalability for Partner Banks (Danamon, Krungsri)
*   **The Concept**: Partner banks have different IT budgets and maturities.
*   **The Pitch**: *"A complex database and software integration would take 24 months to clear security audits at our partner banks. This gateway is **serverless and database-free**, utilizing their existing M365 cloud subscriptions for instant, secure rollout."*

---

## 4. Key Questions to Anticipate in the Interview

### Q1: "If the data is redacted, how does the LLM understand the context?"
*   **Answer**: *"The LLM receives the full layout structure, the headers, and the surrounding text context, but the specific sensitive values are replaced with `[REDACTED]`. For calculations or summarizations, the LLM compiles the structural logic (e.g. telling the script to grow Column C by 12% based on Column B), and the local gateway applies the numerical operations where needed."*

### Q2: "How do we verify that the VBA macro binary wasn't corrupted?"
*   **Answer**: *"The script reads the SHA-256 hash of the VBA project file (`vbaProject.bin`) before and after the write. If the post-write hash matches the baseline, we have mathematical proof that the macros were not modified or stripped by the write operations."*
