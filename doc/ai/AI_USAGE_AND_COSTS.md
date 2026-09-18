# OmniEdu — AI Token Consumption, Quotas & Financial Cost Monitoring

## 1. Multi-Tenant SaaS Quota Architecture
To protect tenant profitability and prevent unbounded API expenditures, OmniEdu enforces tenant-level monthly token quotas tied to the customer's subscription tier:

| SaaS Plan Tier | Monthly Included Tokens | Max Burst QPS | Overage Handling |
| :--- | :--- | :--- | :--- |
| **Starter** | 100,000 tokens | 2 req / sec | Fallback to Local Heuristic Engine |
| **Professional** | 1,000,000 tokens | 5 req / sec | Soft warning at 85%, then Local fallback |
| **Enterprise** | 10,000,000 tokens | 25 req / sec | Auto-scale with agreed overage billing |

---

## 2. Cost Estimation Models
OmniEdu tracks token economics in both United States Dollars (USD) and Indian Rupees (INR):

$$\text{Cost}_{\text{USD}} = \frac{\text{PromptTokens} \times \$0.15}{1{,}000{,}000} + \frac{\text{CompletionTokens} \times \$0.60}{1{,}000{,}000}$$
$$\text{Cost}_{\text{INR}} = \text{Cost}_{\text{USD}} \times 84.50$$

### Feature Allocation Breakdown:
- **Assistant Chat**: ~35% of token spend
- **Early Warning Analysis**: ~25% of token spend
- **Exam Question Generation**: ~20% of token spend
- **Institutional RAG & Ingestion**: ~15% of token spend
- **Assisted Grading & Communications**: ~5% of token spend

---

## 3. Quota Enforcement Algorithm
Before invoking cloud LLM providers, `aiUsage.service.ts` verifies:
```typescript
const quotaRemaining = tokenQuota - currentMonthConsumption;
if (quotaRemaining <= 0) {
  logger.warn({ orgId }, 'Tenant exceeded monthly AI token quota; falling back to local heuristic');
  return LocalHeuristicProvider;
}
```
Tenants are never billed unexpected surprise charges; zero downtime is preserved via automated fallback.
