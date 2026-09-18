# OmniEdu — AI Data Retention, Expiration & Regulatory Privacy

## 1. Compliance Mandate
OmniEdu complies with global and regional data protection regulations governing educational technology:
- **Digital Personal Data Protection (DPDP) Act, 2023 (India)**: Strict restrictions on processing child personal data.
- **FERPA (US Family Educational Rights and Privacy Act)**: Protection of student educational records and transcripts.
- **GDPR (EU General Data Protection Regulation)**: Right to be forgotten and data minimization standards.

---

## 2. AI Data Lifecycle & Retention Schedules

| Data Entity | Retention Period | Purge / Anonymization Strategy |
| :--- | :--- | :--- |
| **Conversations & Messages** | 90 days | Hard delete from `AiMessage` and `AiConversation` |
| **Tool Execution Logs** | 180 days | Anonymized audit log preservation |
| **Risk Prediction Snapshots** | 2 Academic Years | Aggregated into historical cohort statistics; individual records purged upon graduation |
| **Document Vector Chunks** | Lifetime of Document | Hard deleted immediately upon parent document deletion via cascade |
| **Question Generation Drafts** | 30 days if unreviewed | Expired drafts purged automatically; approved questions moved to permanent bank |
| **Usage & Cost Metrics** | 3 Fiscal Years | Retained for financial auditing and SaaS subscription accounting |

---

## 3. Immediate Right-to-Erasure Workflow
When a student or institution requests data erasure:
1. All embeddings and vector chunks associated with the institution or student documents are deleted immediately.
2. AI conversation threads involving the student identifier are purged.
3. Risk predictions associated with `studentId` are permanently truncated.
