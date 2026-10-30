/*
# Master admin core schema

1. Plain-English summary
- Creates the tables that power the private master admin website: admin accounts and roles, KYC registration requests, issued user IDs, feature and package records, payment status, support tickets, security alerts, audit logs and integration settings for the two future applications.
- Every table is marked with an is_demo flag so demo data can be clearly labelled and removed later.

2. New tables
- admin_users: which signed-in accounts are administrators and their role (owner, admin, support, viewer).
- registration_requests: registration requests submitted by the future KYC app (demo data only).
- app_users: user accounts that received a unique user ID after approval.
- packages: purchasable packages (demo package priced at 20 INR).
- features: individually priced features for each future application (demo feature price 5 INR).
- user_entitlements: which package or feature a user holds, with payment and package status.
- support_tickets and ticket_replies: complaints and support requests with admin replies.
- security_alerts: security notices for the admin team.
- audit_logs: record of every administrative action (written only by database functions).
- integration_settings: connection settings for the two future applications (no secret values are stored here).

3. Security
- Row level security is enabled on every table.
- Signed-in administrators can READ tables. No table grants INSERT, UPDATE or DELETE to any client role.
- All changes go through security functions (added in a follow-up migration) that check the caller's admin role on the server.
- Anonymous visitors have no access to any of these tables.

4. Important notes
- The admin_role() helper returns the caller's admin role or nothing; it is used by read policies.
- Columns that must never hold real Aadhaar, PAN, bank, OTP or biometric data are not present in these tables.
*/

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'support', 'viewer')),
  display_name text NOT NULL DEFAULT 'Administrator',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name text NOT NULL,
  email text NOT NULL,
  mobile text NOT NULL,
  city text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'correction_requested')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_requests_status_idx ON public.registration_requests (review_status);

CREATE SEQUENCE IF NOT EXISTS public.app_user_code_seq START WITH 100010;

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  mobile text NOT NULL,
  city text,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')),
  registration_request_id uuid UNIQUE REFERENCES public.registration_requests(id) ON DELETE SET NULL,
  user_id_issued_at timestamptz NOT NULL DEFAULT now(),
  password_reset_requested_at timestamptz,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_users_status_idx ON public.app_users (account_status);

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_inr integer NOT NULL CHECK (price_inr >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  app_target text NOT NULL CHECK (app_target IN ('kyc', 'services')),
  price_inr integer NOT NULL CHECK (price_inr >= 0),
  is_enabled boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages(id) ON DELETE RESTRICT,
  feature_id uuid REFERENCES public.features(id) ON DELETE RESTRICT,
  payment_status text NOT NULL DEFAULT 'demo_unpaid' CHECK (payment_status IN ('demo_unpaid', 'demo_paid')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(package_id, feature_id) = 1)
);
CREATE INDEX IF NOT EXISTS user_entitlements_user_idx ON public.user_entitlements (app_user_id);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL UNIQUE,
  app_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('complaint', 'kyc_query', 'payment', 'technical', 'other')),
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_replies_ticket_idx ON public.ticket_replies (ticket_id);

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  body text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_settings (
  app_key text PRIMARY KEY CHECK (app_key IN ('kyc', 'services')),
  display_name text NOT NULL,
  base_url text,
  secret_names text[] NOT NULL DEFAULT '{}',
  connection_status text NOT NULL DEFAULT 'not_configured' CHECK (connection_status IN ('not_configured', 'configured')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.role FROM public.admin_users a WHERE a.user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_role() TO authenticated;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_users, public.registration_requests, public.app_users, public.packages,
  public.features, public.user_entitlements, public.support_tickets, public.ticket_replies,
  public.security_alerts, public.audit_logs, public.integration_settings TO authenticated;

DROP POLICY IF EXISTS "admin_read_admin_users" ON public.admin_users;
CREATE POLICY "admin_read_admin_users" ON public.admin_users FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_registration_requests" ON public.registration_requests;
CREATE POLICY "admin_read_registration_requests" ON public.registration_requests FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_app_users" ON public.app_users;
CREATE POLICY "admin_read_app_users" ON public.app_users FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_packages" ON public.packages;
CREATE POLICY "admin_read_packages" ON public.packages FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_features" ON public.features;
CREATE POLICY "admin_read_features" ON public.features FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_user_entitlements" ON public.user_entitlements;
CREATE POLICY "admin_read_user_entitlements" ON public.user_entitlements FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_support_tickets" ON public.support_tickets;
CREATE POLICY "admin_read_support_tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_ticket_replies" ON public.ticket_replies;
CREATE POLICY "admin_read_ticket_replies" ON public.ticket_replies FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_security_alerts" ON public.security_alerts;
CREATE POLICY "admin_read_security_alerts" ON public.security_alerts FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_read_audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_integration_settings" ON public.integration_settings;
CREATE POLICY "admin_read_integration_settings" ON public.integration_settings FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);
