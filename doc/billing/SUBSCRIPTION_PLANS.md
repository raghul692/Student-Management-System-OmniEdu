# OmniEdu Unified Educational ERP — Subscription Plans & Billing Lifecycle

This document specifies commercial tiers, resource quotas, feature entitlements, and payment provider abstraction architecture.

---

## 1. Commercial Plans & Quotas

| Plan Tier | Annual Pricing (INR / USD) | Student Quota | Campuses Included | Storage Quota | Key Included Features |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Basic** | ₹49,999 / $699 / year | Up to 500 | 1 Campus | 10 GB | Attendance, CIA Marks, Basic Reports, Standard Web Access |
| **Pro** | ₹1,49,999 / $1,999 / year | Up to 2,500 | Up to 5 Campuses | 50 GB | AI Copilot, Early Warning Radar, PWA Portals, Custom Branding |
| **Enterprise** | Custom Trust Licensing | Unlimited | Unlimited Campuses | 500 GB+ | Webhooks, Audit Export, FERPA Scrubbing, Dedicated SLA |

---

## 2. Subscription Lifecycle States

```
                 [Trial / Signup]
                        │
                        ▼
                  ┌───────────┐
       ┌─────────►│  ACTIVE   │◄─────────┐
       │          └─────┬─────┘          │
       │                │                │
(Payment Success)       │ (Payment Due)  │ (Payment Resolved)
       │                ▼                │
       │          ┌───────────┐          │
       └──────────┤ PAST_DUE  ├──────────┘
                  └─────┬─────┘
                        │ (Grace Period Expired)
                        ▼
                  ┌───────────┐
                  │ CANCELLED │
                  └───────────┘
```

- **ACTIVE**: All tier entitlements enabled; background sync active.
- **PAST_DUE**: 14-day grace period; alerts displayed to `ORG_ADMIN`; system read-write remains active.
- **CANCELLED**: Account downgraded to read-only archival mode; background scheduled jobs suspended.

---

## 3. Payment Gateway Abstraction Architecture

OmniEdu adheres to a modular payment gateway abstraction layer. Production deployments support **Razorpay** (India / INR) and **Stripe** (International / USD) without hardcoding proprietary vendor logic:

```typescript
// server/src/services/billing/billingProvider.interface.ts
export interface BillingProvider {
  createCustomer(orgId: string, email: string): Promise<string>;
  createSubscription(customerId: string, planTier: string): Promise<SubscriptionResult>;
  cancelSubscription(subId: string): Promise<void>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
```

- **Default Mode**: `UNCONFIGURED` (allows guest sandbox evaluation and enterprise invoice-based offline settlement).
- **Environment Flags**:
  - `BILLING_PROVIDER=RAZORPAY` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`)
  - `BILLING_PROVIDER=STRIPE` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
