# Business Case & ROI Analysis: DocAccess Spreadsheet AI Gateway
**Prepared by**: Digital Strategy Advisory (Digital Strategy Division, APAC)
**Subject**: Financial & Risk Evaluation of Decoupled AI Gateways for APAC Partner Banks (Krungsri, Danamon)

---

## 1. Executive Summary

This business case evaluates the financial and operational feasibility of deploying the **DocAccess Co-Pilot Gateway** versus standard enterprise-wide **Microsoft Copilot for Microsoft 365** seat licensing.

From a management consulting perspective, the core thesis is that **horizontal AI licensing creates a significant cost tax with high compliance risk**. By decoupling the AI model via a centralized API gateway and utilizing native spreadsheet range protections, GLOBAL-BANK and its partner banks can achieve **a 92% reduction in software licensing costs** while programmatically eliminating model corruption and data leakage risks.

---

## 2. Financial Model & ROI (TCO Comparison)

To illustrate the commercial rationale, we model a pilot deployment for **1,000 analysts** across GLOBAL-BANK APAC, Krungsri, and Danamon.

### A. Total Cost of Ownership (TCO) - Annual Run Rate

| Cost Element | Option A: Horizontal Seat Model (M365 Copilot) | Option B: Decoupled Gateway Model (DocAccess) |
| :--- | :--- | :--- |
| **Licensing Model** | Seat-based ($30/user/month list price) | Pay-as-you-use (Centralized API Service Account) |
| **Seat License Costs** | $30 × 12 × 1,000 = **$360,000** | $0 (Checker uses standard Office 365) |
| **API Token Usage Costs** | Included | ~1,000 prompts/day @ $0.002/1k tokens = **$15,000** |
| **Infrastructure / Gateway** | Included | Hosting (Serverless/AWS Lambda/Cloud Run) = **$6,000** |
| **Maintenance & Support** | Included | Internal IT Support allocation = **$8,000** |
| **Total Annual Cost** | **$360,000** | **$29,000** |
| **Net Annual Savings** | - | **$331,000 (92% Cost Reduction)** |

### B. Payback Period & NPV (3-Year Forecast)
*   **Initial Capital Expenditure (CapEx)**: $45,000 (MVP refinement, security review, partner bank setup).
*   **Discount Rate**: 8% (Standard banking hurdle rate).
*   **Net Present Value (NPV)**: **$807,430** over 3 years.
*   **Internal Rate of Return (IRR)**: **723%**.
*   **Payback Period**: **1.6 Months**.

---

## 3. Operational Efficiency (FTE Impact)

The deployment optimizes core spreadsheet-heavy workflows (e.g. drafting credit appraisal templates, market analysis compilation, stress-test calculations):

*   **FTE Savings**: Average analyst spends **12 hours/week** manual-compiling, structuring, and updating spreadsheets.
*   **AI Productivity Factor**: Based on pilot tests, automated cell generation reduces this time by **45%**.
*   **Hours Saved**: **5.4 hours/analyst/week**.
*   **Annual Hours Saved (1,000 Analysts)**: 5.4 × 48 weeks × 1,000 = **259,200 hours**.
*   **FTE Equivalency**: **135 Full-Time Employees reallocated** to high-value strategic VC sourcing and risk review operations.

---

## 4. Risk Mitigation Matrix

Financial institutions cannot rely on soft system instructions (prompt governance) to enforce compliance. The table below outlines how this architecture programmatically mitigates banking operational risks:

| Identified Risk | Impact Level | Standard AI Mitigation (Weak) | DocAccess Decoupled Mitigation (Robust) |
| :--- | :--- | :--- | :--- |
| **Data Leakage (PII / Secrecy)** | **CRITICAL** (MAS Fine/Loss of License) | Prompt instruction: *"Do not send sensitive customer names to external servers."* | **Local Pre-Redaction Engine**: Strips sensitive cell values inside the bank's firewall *before* the API compiles the prompt payload. |
| **Model Hallucination (Formula Corruption)** | **HIGH** (Financial loss in trading/forecasting) | Prompt instruction: *"Do not alter cell formulas or overwrite B6."* | **Native Cloud Range Locks**: Google/MS Graph API returns a hard `403 Forbidden` error if the LLM attempts to write outside allowed edit range exceptions. |
| **Vendor Lock-in & Pricing Risk** | **MEDIUM** (High switching costs) | Committing to exclusive M365 or Google Workspace AI contracts. | **Decoupled API Routing**: Swaps underlying model APIs (Gemini, Claude, GPT-4) instantly behind the gateway without UI disruption. |
| **Audit Compliance Failures** | **HIGH** (Regulatory audit citation) | Unstructured prompt history logs. | **Native Version History**: Standard audit trails track every edit back to the `llm-agent` service account in Excel/SharePoint. |

---

## 5. Strategic Recommendation

The Digital Strategy Division recommends adopting the **Decoupled Gateway Pattern** for regional deployment across APAC partner banks:
1.  It aligns with **Responsible AI Principles** by providing programmatic safeguards (IAM-enforced boundaries) instead of statistical guardrails (prompts).
2.  It delivers a **compelling cost-benefit profile** that scales without the licensing tax of seat-based SaaS platforms.
3.  It preserves the **existing front-office user experience**, ensuring rapid user adoption.
