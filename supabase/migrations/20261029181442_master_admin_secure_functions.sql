/*
# Master admin secure action functions

1. Plain-English summary
- Adds the only way administrators can change data: named database functions that check the caller's role on the server before doing anything.
- Every successful action writes a line to the audit log in the same step.

2. Functions added
- require_admin: internal helper that confirms the caller is an admin with one of the allowed roles.
- log_admin_action: internal helper that writes an audit log line.
- review_registration: approve, reject or request corrections on a KYC registration request.
- issue_user_id: create a unique user ID for an approved registration.
- set_account_status: set a user account to active, suspended or deactivated.
- request_password_reset: record a secure password reset request for a user account.
- set_feature_enabled: turn an application feature on or off.
- reply_to_ticket: add an admin reply and/or change a support ticket status.
- resolve_security_alert: mark a security alert as resolved.
- update_integration_settings: save the connection settings for a future application (no secrets).

3. Security
- Internal helpers are not callable by anonymous or signed-in client roles.
- Public functions are callable only by signed-in users; the role check inside each function decides whether the action is allowed.
- Roles: owner and admin can manage registrations, users, features, alerts and integrations. Support can also reply to tickets. Viewer is read-only.

4. Important notes
- Functions use an empty search path and fully qualified table names to prevent search path tampering.
- Functions are idempotent in effect: repeating a status change simply sets the same value again.
*/

CREATE OR REPLACE FUNCTION public.require_admin(p_roles text[])
RETURNS public.admin_users
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
BEGIN
  SELECT * INTO v_admin FROM public.admin_users WHERE user_id = auth.uid();
  IF v_admin.user_id IS NULL OR NOT (v_admin.role = ANY (p_roles)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN v_admin;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.require_admin(text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_actor public.admin_users,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_summary text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, summary)
  VALUES (p_actor.user_id, p_actor.display_name, p_action, p_entity_type, p_entity_id, p_summary);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(public.admin_users, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_registration(p_request_id uuid, p_decision text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_req public.registration_requests;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  IF p_decision NOT IN ('approved', 'rejected', 'correction_requested') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  IF p_decision <> 'approved' AND v_note IS NULL THEN
    RAISE EXCEPTION 'A note is required for this decision';
  END IF;

  SELECT * INTO v_req FROM public.registration_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Registration request not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_users u WHERE u.registration_request_id = p_request_id) THEN
    RAISE EXCEPTION 'A user ID has already been issued for this request';
  END IF;

  UPDATE public.registration_requests
  SET review_status = p_decision,
      review_note = v_note,
      reviewed_at = now(),
      reviewed_by = v_admin.user_id
  WHERE id = p_request_id;

  PERFORM public.log_admin_action(v_admin, 'registration.' || p_decision, 'registration_request',
    p_request_id::text, v_req.applicant_name || ': ' || p_decision);
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_user_id(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_req public.registration_requests;
  v_code text;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  SELECT * INTO v_req FROM public.registration_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Registration request not found';
  END IF;
  IF v_req.review_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved requests can receive a user ID';
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_users u WHERE u.registration_request_id = p_request_id) THEN
    RAISE EXCEPTION 'A user ID has already been issued for this request';
  END IF;

  v_code := 'MU-' || nextval('public.app_user_code_seq');

  INSERT INTO public.app_users (user_code, full_name, email, mobile, city, registration_request_id, is_demo)
  VALUES (v_code, v_req.applicant_name, v_req.email, v_req.mobile, v_req.city, p_request_id, v_req.is_demo);

  PERFORM public.log_admin_action(v_admin, 'user_id.issued', 'app_user', v_code,
    'Issued ' || v_code || ' to ' || v_req.applicant_name);

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_account_status(p_app_user_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_user public.app_users;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  IF p_status NOT IN ('active', 'suspended', 'deactivated') THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;

  SELECT * INTO v_user FROM public.app_users WHERE id = p_app_user_id FOR UPDATE;
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'User account not found';
  END IF;

  UPDATE public.app_users SET account_status = p_status WHERE id = p_app_user_id;

  PERFORM public.log_admin_action(v_admin, 'account.' || p_status, 'app_user', v_user.user_code,
    v_user.user_code || ' status set to ' || p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_password_reset(p_app_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_user public.app_users;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  SELECT * INTO v_user FROM public.app_users WHERE id = p_app_user_id FOR UPDATE;
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'User account not found';
  END IF;

  UPDATE public.app_users SET password_reset_requested_at = now() WHERE id = p_app_user_id;

  PERFORM public.log_admin_action(v_admin, 'account.password_reset_requested', 'app_user', v_user.user_code,
    'Password reset requested for ' || v_user.user_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_feature_enabled(p_feature_id uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_feature public.features;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  SELECT * INTO v_feature FROM public.features WHERE id = p_feature_id FOR UPDATE;
  IF v_feature.id IS NULL THEN
    RAISE EXCEPTION 'Feature not found';
  END IF;

  UPDATE public.features SET is_enabled = p_enabled WHERE id = p_feature_id;

  PERFORM public.log_admin_action(v_admin,
    CASE WHEN p_enabled THEN 'feature.enabled' ELSE 'feature.disabled' END,
    'feature', v_feature.code, v_feature.name || CASE WHEN p_enabled THEN ' turned on' ELSE ' turned off' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.reply_to_ticket(p_ticket_id uuid, p_body text, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_ticket public.support_tickets;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin', 'support']);

  IF p_status NOT IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid ticket status';
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_body IS NOT NULL THEN
    INSERT INTO public.ticket_replies (ticket_id, author_id, author_name, body)
    VALUES (p_ticket_id, v_admin.user_id, v_admin.display_name, v_body);
  END IF;

  UPDATE public.support_tickets SET status = p_status, updated_at = now() WHERE id = p_ticket_id;

  PERFORM public.log_admin_action(v_admin,
    CASE WHEN v_body IS NULL THEN 'ticket.status_changed' ELSE 'ticket.replied' END,
    'support_ticket', v_ticket.ticket_no, v_ticket.ticket_no || ' set to ' || p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_security_alert(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_alert public.security_alerts;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  SELECT * INTO v_alert FROM public.security_alerts WHERE id = p_alert_id FOR UPDATE;
  IF v_alert.id IS NULL THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;

  UPDATE public.security_alerts SET is_resolved = true, resolved_at = now() WHERE id = p_alert_id;

  PERFORM public.log_admin_action(v_admin, 'alert.resolved', 'security_alert', p_alert_id::text, v_alert.title || ' resolved');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_integration_settings(p_app_key text, p_base_url text, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin public.admin_users;
  v_url text := nullif(btrim(coalesce(p_base_url, '')), '');
  v_setting public.integration_settings;
BEGIN
  v_admin := public.require_admin(ARRAY['owner', 'admin']);

  IF v_url IS NOT NULL AND v_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^\s]*)?$' THEN
    RAISE EXCEPTION 'Base URL must start with https://';
  END IF;

  SELECT * INTO v_setting FROM public.integration_settings WHERE app_key = p_app_key FOR UPDATE;
  IF v_setting.app_key IS NULL THEN
    RAISE EXCEPTION 'Unknown application';
  END IF;

  UPDATE public.integration_settings
  SET base_url = v_url,
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      connection_status = CASE WHEN v_url IS NULL THEN 'not_configured' ELSE 'configured' END,
      updated_at = now()
  WHERE app_key = p_app_key;

  PERFORM public.log_admin_action(v_admin, 'integration.updated', 'integration', p_app_key,
    v_setting.display_name || ' connection settings updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_registration(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.issue_user_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_account_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_password_reset(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_feature_enabled(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_security_alert(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_integration_settings(text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.review_registration(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_account_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_password_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_feature_enabled(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_security_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_integration_settings(text, text, text) TO authenticated;
