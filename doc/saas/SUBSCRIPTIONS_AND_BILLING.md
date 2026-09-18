# OmniEdu — Multi-Tenant SaaS Subscriptions & Tiered Billing

## 1. Plan Hierarchy
OmniEdu provides three distinct SaaS subscription plans for educational organizations:

| Feature Dimension | BASIC Tier | PRO Tier | ENTERPRISE Tier |
| :--- | :--- | :--- | :--- |
| **Max Campuses / Institutions** | 1 Campus | 5 Campuses | Unlimited (999) |
| **Max Enrolled Students** | 500 Students | 5,000 Students | Unlimited (1,000,000) |
| **Custom Roles & Fine-Grained RBAC**| ❌ Disabled | ✅ Enabled | ✅ Enabled |
| **Advanced Predictive Analytics** | ❌ Disabled | ✅ Enabled | ✅ Enabled |
| **Automated Email Notifications** | ❌ Disabled | ✅ Enabled | ✅ Enabled |
| **Automated Hall-Ticket QR Tokens** | ❌ Disabled | ❌ Disabled | ✅ Enabled |
| **Priority SLAs & Dedicated Backup** | ❌ Standard | ❌ Standard | ✅ 24/7 Dedicated Support |

## 2. Server-Side Limit Enforcement
Subscription limits are strictly evaluated in middleware and services before database modifications occur.

### 2.1 Institution Quota Guard (`enforceInstitutionCreationLimit`)
Before creating a new campus under an organization:
```typescript
const count = await prisma.institution.count({ where: { organizationId } });
if (count >= tierLimits.maxInstitutions) {
  throw new AppError(
    `Organization has reached the maximum institution limit (${tierLimits.maxInstitutions}) for tier ${sub.plan}. Upgrade your subscription to add more campuses.`,
    403
  );
}
```

### 2.2 Student Enrollment Quota Guard
Before admitting or enrolling students:
```typescript
const studentCount = await prisma.student.count({
  where: { institution: { organizationId } }
});
if (studentCount >= tierLimits.maxStudents) {
  throw new AppError(
    `Student enrollment limit reached for your subscription plan.`,
    403
  );
}
```

## 3. Subscription Endpoints
- `GET /api/saas/subscription?organizationId=<orgId>`: Returns active subscription status, plan name, renewal dates, and real-time utilization vs limits.
- `POST /api/saas/subscription/upgrade`: Allows authorized `ORG_ADMIN` users to upgrade between `BASIC`, `PRO`, and `ENTERPRISE` tiers.
