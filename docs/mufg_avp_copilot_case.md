# MUFG AVP Case Study: Secure Spreadsheet AI Co-Pilot

This case study outlines the architecture of an enterprise-grade AI spreadsheet co-pilot tailored for banking operations (such as credit analysis, digital strategy, or risk forecasting). It models how to implement a secure, low-overhead **Maker-Checker workflow** using native Google Workspace protections and command-line execution.

---

## 1. The Core Architecture

The system utilizes a split interface: **Google Sheets** for data visual grids and **Antigravity CLI** as the human-in-the-loop checker command terminal.

```
+-----------------------------------------------------------------------------------+
|                            1. IT DEPARTMENT GOVERNANCE                            |
|  Defines and locks the system prompt rules in system.md to ensure compliance,     |
|  responsible AI use, and proper JSON schema formatting.                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                            2. GOOGLE SHEET PROTECTION                             |
|  - Owned by checker@gmail.com. Shared with LLM@gmail.com.                         |
|  - Security: "Protect Sheet" is enabled (Least-Privilege).                       |
|  - Exception: Only specific target cell ranges are marked as editable exceptions.  |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Read Sheet DOM + Protections
                                         v
+-----------------------------------------------------------------------------------+
|                        3. HUMAN INTERACTION (Antigravity CLI)                     |
|  - Checker types prompt instruction in Antigravity terminal.                      |
|  - Agent reads Sheet, reads system.md, and drafts cell updates.                   |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Write Updates (REST API call)
                                         v
+-----------------------------------------------------------------------------------+
|                         4. NATIVE CLOUD GUARDIAN (Google IAM)                     |
|  - Writes to exception range: APPROVED (Applied to sheet).                        |
|  - Writes to locked ranges/formulas: BLOCKED (Returns 403 Forbidden).             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Key Workflow Roles & Responsibilities

### A. The IT Department (Governance)
IT maintains absolute control over the AI agent's instructions by defining the `system.md` rules locally (or via an enterprise policy server).
*   **Rule Enforcements**: The LLM is instructed to identify cells containing formulas (e.g. `=SUM(...)`) and leave them completely untouched.
*   **Response Standards**: Enforces a strict JSON structure for updates to ensure the CLI script can read and parse changes deterministically.

### B. The Human Checker (Control & Least Privilege)
The checker owns the data sheet (`checker@gmail.com`) and manages access boundaries natively:
1.  **Restrict Access**: They right-click the Sheet, choose **Protect Sheet**, and set permissions so only they can edit it.
2.  **Declare Exceptions**: They add a range exception (e.g., `C2:C4` for the forecast inputs) and add `llm@gmail.com` as an authorized editor *only* for that specific range.
3.  **Initiate Execution**: The checker types instructions in the terminal (e.g. *"Fill in C2:C4 with a 12% revenue growth projection based on the budget in column B"*).

### C. The LLM Agent (Execution & Native Boundary Guard)
The local client running under `llm@gmail.com` executes the loop:
1.  **Retrieve**: Pulls sheet values and sheet protection metadata via Google Sheets API.
2.  **Draft**: Maps unprotected cells as writable, compiles the prompt, calls the LLM, and formats the output.
3.  **Apply**: Attempts to post the updates.
4.  **Google Security Wall**: If the LLM generates a change outside the allowed exception range, Google's API natively blocks the write. The checker can review the final edits and use Google's native **Version History** to rollback any incorrect formatting.

---

## 3. Interview Value Proposition (AVP Business Transformation)

When interviewing for the **AVP, Business Transformation** role at MUFG, this architecture highlights critical skills:

1.  **Operational Risk Mitigation**:
    You address the key compliance objection to AI: *"How do we prevent the LLM from corrupting audited spreadsheets?"* Instead of trusting the LLM to follow prompt instructions, you use Google’s cloud IAM as a physical gatekeeper.
2.  **Low Integration Overhead**:
    You show that digital transformation doesn't require building massive new custom database applications. We can achieve enterprise-grade AI safety using the tools the bank already owns (Google Sheets and local script clients).
3.  **IT Policy Alignment**:
    By separating the prompt governance (`system.md` written by IT) from the data ownership (managed by the front-office checker), you demonstrate an understanding of enterprise IT governance structures.
