-- Phase 1 of the permissions revamp (docs/plans/permissions-revamp_2026-04-23).
-- Replaces the coarse permission keys on system roles (crm / operations /
-- settings / settings.branding) with sidebar-aligned granular keys plus
-- integration toggles. Kept in sync with lib/permissions.ts defaults.
UPDATE tenant_roles
SET permissions = CASE slug
    WHEN 'owner' THEN '{
        "crm.clients": {"read": true, "write": true, "delete": true},
        "ops.jobs": {"read": true, "write": true, "delete": true},
        "ops.schedule": {"read": true, "write": true, "delete": true},
        "ops.reports": {"read": true, "write": true, "delete": true},
        "ops.services": {"read": true, "write": true, "delete": true},
        "finance.quotes": {"read": true, "write": true, "delete": true},
        "finance.invoices": {"read": true, "write": true, "delete": true},
        "finance.pricing": {"read": true, "write": true, "delete": true},
        "settings.users": {"read": true, "write": true, "delete": true},
        "settings.roles": {"read": true, "write": true},
        "settings.company": {"read": true, "write": true},
        "settings.subscription": {"read": true, "write": true},
        "integrations.xero.connect": {"write": true},
        "integrations.xero.sync": {"write": true},
        "integrations.outlook.connect": {"write": true}
    }'::jsonb
    WHEN 'admin' THEN '{
        "crm.clients": {"read": true, "write": true, "delete": true},
        "ops.jobs": {"read": true, "write": true, "delete": true},
        "ops.schedule": {"read": true, "write": true, "delete": true},
        "ops.reports": {"read": true, "write": true, "delete": true},
        "ops.services": {"read": true, "write": true, "delete": true},
        "finance.quotes": {"read": true, "write": true, "delete": true},
        "finance.invoices": {"read": true, "write": true, "delete": true},
        "finance.pricing": {"read": true, "write": true, "delete": true},
        "settings.users": {"read": true, "write": true, "delete": true},
        "settings.company": {"read": true, "write": true},
        "settings.subscription": {"read": true, "write": true},
        "integrations.xero.connect": {"write": true},
        "integrations.xero.sync": {"write": true},
        "integrations.outlook.connect": {"write": true}
    }'::jsonb
    WHEN 'manager' THEN '{
        "crm.clients": {"read": true, "write": true},
        "ops.jobs": {"read": true, "write": true},
        "ops.schedule": {"read": true, "write": true},
        "ops.reports": {"read": true, "write": true},
        "ops.services": {"read": true},
        "finance.quotes": {"read": true, "write": true},
        "finance.invoices": {"read": true, "write": true},
        "finance.pricing": {"read": true},
        "settings.users": {"read": true},
        "settings.company": {"read": true},
        "integrations.xero.sync": {"write": true}
    }'::jsonb
    WHEN 'member' THEN '{
        "crm.clients": {"read": true, "write": true},
        "ops.jobs": {"read": true, "write": true},
        "ops.schedule": {"read": true, "write": true},
        "ops.reports": {"read": true, "write": true},
        "ops.services": {"read": true},
        "finance.quotes": {"read": true, "write": true},
        "finance.invoices": {"read": true},
        "finance.pricing": {"read": true},
        "settings.company": {"read": true}
    }'::jsonb
    WHEN 'viewer' THEN '{
        "crm.clients": {"read": true},
        "ops.jobs": {"read": true},
        "ops.schedule": {"read": true},
        "ops.reports": {"read": true},
        "ops.services": {"read": true},
        "finance.quotes": {"read": true},
        "finance.invoices": {"read": true},
        "finance.pricing": {"read": true}
    }'::jsonb
END
WHERE is_system = true
  AND slug IN ('owner', 'admin', 'manager', 'member', 'viewer');
