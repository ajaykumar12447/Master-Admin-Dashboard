/*
# Account access approvals

1. Plain-English summary
- New accounts that sign in but are not administrators are now recorded as "pending" and wait for an owner or admin to approve or block them.
- Approving an account grants admin site access with a chosen role. Blocking removes access.

2. New table
- account_access_requests: one row per signed-in account that is not yet an administrator. Holds the email, status (pending, approved, blocked), the role granted on approval, and who decided and when.

3. New functions
- request_admin_access: called by a signed-in non-administrator; creates their pending request if none exists and returns their status.
- review_access_request: owner or admin approves (with a role) or blocks an account. Only the owner can grant the admin role or change an existing administrator. The owner account cannot be blocked or changed, and nobody can block themselves.

4. Security
- Row level security is enabled. Users can read only their own request; owners and admins can read all requests.
- No client role can insert, update or delete any table directly. All changes go through the functions above, which check roles on the server.
- Table privileges for the anonymous and signed-in client roles are reduced to read-only, so RLS and grants both block direct writes.

5. Important notes
- Each decision is written to the audit log.
*/

CREATE TABLE IF NOT EXISTS public.account_access_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
  decided_role text CHECK (decided_role IN ('admin', 'support', 'viewer')),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_access_requests_status_idx ON public.account_access_requests (status);

ALTER TABLE public.account_access_requests ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON public.account_access_requests TO authenticated;

DROP POLICY IF EXISTS "own_access_request_read" ON public.account_access_requests;
CREATE POLICY "own_access_request_read" ON public.account_access_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_read_access_requests" ON public.account_access_requests;
CREATE POLICY "admin_read_access_requests" ON public.account_access_requests FOR SELECT TO authenticated
  USING (public.admin_role() IN ('owner', 'admin'));

CREATE OR REPLACE FUNCTION public.request_admin_access()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.account_access_requests (user_id, email)
  SELECT u.id, coalesce(u.email, '') FROM auth.users u WHERE u.id = v_uid
  ON CONFLICT (user_id) DO NOTHING;

  SELECT r.status INTO v_status FROM public.account_access_requests r WHERE r.user_id = v_uid;
  RETURN coalesce(v_status, 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_access_request(p_user_id uuid, p_decision text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_req public.account_access_requests;
  v_existing_role text;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  IF p_decision NOT IN ('approved', 'blocked') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT * INTO v_req FROM public.account_access_requests WHERE user_id = p_user_id FOR UPDATE;
  IF v_req.user_id IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;

  SELECT a.role INTO v_existing_role FROM public.admin_users a WHERE a.user_id = p_user_id;
  IF v_existing_role = 'owner' THEN
    RAISE EXCEPTION 'The owner account cannot be changed here';
  END IF;
  IF v_existing_role IS NOT NULL AND v_admin.role <> 'owner' THEN
    RAISE EXCEPTION 'Only the owner can change an existing administrator';
  END IF;

  IF p_decision = 'approved' THEN
    IF p_role NOT IN ('admin', 'support', 'viewer') THEN
      RAISE EXCEPTION 'Invalid role';
    END IF;
    IF p_role = 'admin' AND v_admin.role <> 'owner' THEN
      RAISE EXCEPTION 'Only the owner can grant the admin role';
    END IF;

    INSERT INTO public.admin_users (user_id, role, display_name)
    VALUES (p_user_id, p_role, split_part(v_req.email, '@', 1))
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.account_access_requests
    SET status = 'approved', decided_role = p_role, decided_at = now(), decided_by = v_admin.user_id
    WHERE user_id = p_user_id;

    PERFORM public.log_admin_action(v_admin, 'access.approved', 'account_access', v_req.email,
      v_req.email || ' approved as ' || p_role);
  ELSE
    IF p_user_id = v_admin.user_id THEN
      RAISE EXCEPTION 'You cannot block your own account';
    END IF;

    DELETE FROM public.admin_users WHERE user_id = p_user_id;

    UPDATE public.account_access_requests
    SET status = 'blocked', decided_role = NULL, decided_at = now(), decided_by = v_admin.user_id
    WHERE user_id = p_user_id;

    PERFORM public.log_admin_action(v_admin, 'access.blocked', 'account_access', v_req.email,
      v_req.email || ' blocked');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_admin_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_admin_access() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_access_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_access_request(uuid, text, text) TO authenticated;
