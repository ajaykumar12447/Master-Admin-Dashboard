/*
# Demo seed data (clearly labelled as demo)

1. Plain-English summary
- Adds sample registration requests, user accounts, a demo package priced at 20 INR, demo features priced at 5 INR each, sample payment statuses, support tickets, security alerts, audit history and connection settings for both future applications.
- Every demo row has is_demo = true so the admin site can label it as demo data.
- No real personal documents, Aadhaar, PAN, bank, OTP or biometric data are included.

2. Tables modified
- registration_requests, app_users, packages, features, user_entitlements, support_tickets, ticket_replies, security_alerts, audit_logs, integration_settings: sample rows inserted.
- app_user_code_seq: advanced past the seeded user IDs so new IDs do not collide.

3. Security
- No policy or permission changes. Seed rows follow the existing read-only rules.

4. Important notes
- Inserts use fixed identifiers and ON CONFLICT DO NOTHING so the seed is safe to re-run.
- The seeded user IDs (MU-100010 to MU-100013) are demo identifiers only.
*/

INSERT INTO public.registration_requests (id, applicant_name, email, mobile, city, submitted_at, review_status, review_note, reviewed_at, is_demo) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Rahul Verma', 'rahul.demo@example.com', '+91 90000 00001', 'Pune', now() - interval '1 day', 'pending', NULL, NULL, true),
  ('a0000000-0000-4000-8000-000000000002', 'Priya Sharma', 'priya.demo@example.com', '+91 90000 00002', 'Jaipur', now() - interval '2 days', 'pending', NULL, NULL, true),
  ('a0000000-0000-4000-8000-000000000003', 'Mohammed Irfan', 'irfan.demo@example.com', '+91 90000 00003', 'Lucknow', now() - interval '3 days', 'correction_requested', 'Address details are incomplete. Please resubmit with the full address.', now() - interval '2 days', true),
  ('a0000000-0000-4000-8000-000000000004', 'Sneha Patil', 'sneha.demo@example.com', '+91 90000 00004', 'Nashik', now() - interval '4 days', 'approved', NULL, now() - interval '3 days', true),
  ('a0000000-0000-4000-8000-000000000005', 'Arjun Mehta', 'arjun.demo@example.com', '+91 90000 00005', 'Delhi', now() - interval '20 days', 'approved', NULL, now() - interval '18 days', true),
  ('a0000000-0000-4000-8000-000000000006', 'Kavita Joshi', 'kavita.demo@example.com', '+91 90000 00006', 'Indore', now() - interval '5 days', 'rejected', 'Duplicate request for an existing applicant.', now() - interval '4 days', true),
  ('a0000000-0000-4000-8000-000000000007', 'Deepak Yadav', 'deepak.demo@example.com', '+91 90000 00007', 'Patna', now() - interval '6 hours', 'approved', NULL, now() - interval '2 hours', true),
  ('a0000000-0000-4000-8000-000000000008', 'Anita Das', 'anita.demo@example.com', '+91 90000 00008', 'Kolkata', now() - interval '25 days', 'approved', NULL, now() - interval '22 days', true),
  ('a0000000-0000-4000-8000-000000000009', 'Vikram Singh', 'vikram.demo@example.com', '+91 90000 00009', 'Jodhpur', now() - interval '30 days', 'approved', NULL, now() - interval '28 days', true),
  ('a0000000-0000-4000-8000-00000000000a', 'Lakshmi Iyer', 'lakshmi.demo@example.com', '+91 90000 00010', 'Chennai', now() - interval '35 days', 'approved', NULL, now() - interval '33 days', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_users (id, user_code, full_name, email, mobile, city, account_status, registration_request_id, user_id_issued_at, password_reset_requested_at, is_demo) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'MU-100010', 'Arjun Mehta', 'arjun.demo@example.com', '+91 90000 00005', 'Delhi', 'active', 'a0000000-0000-4000-8000-000000000005', now() - interval '16 days', NULL, true),
  ('b0000000-0000-4000-8000-000000000002', 'MU-100011', 'Anita Das', 'anita.demo@example.com', '+91 90000 00008', 'Kolkata', 'suspended', 'a0000000-0000-4000-8000-000000000008', now() - interval '20 days', now() - interval '1 day', true),
  ('b0000000-0000-4000-8000-000000000003', 'MU-100012', 'Vikram Singh', 'vikram.demo@example.com', '+91 90000 00009', 'Jodhpur', 'active', 'a0000000-0000-4000-8000-000000000009', now() - interval '26 days', NULL, true),
  ('b0000000-0000-4000-8000-000000000004', 'MU-100013', 'Lakshmi Iyer', 'lakshmi.demo@example.com', '+91 90000 00010', 'Chennai', 'deactivated', 'a0000000-0000-4000-8000-00000000000a', now() - interval '31 days', NULL, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.app_user_code_seq', 100013);

INSERT INTO public.packages (id, code, name, description, price_inr, is_active, is_demo) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'DEMO-PKG-STARTER', 'Demo Starter Package', 'Demo package bundling the KYC status tracker and user services access.', 20, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.features (id, code, name, description, app_target, price_inr, is_enabled, is_demo) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'KYC-STATUS-TRACKER', 'KYC status tracker', 'Shows the review stage of a registration to the user.', 'kyc', 5, true, true),
  ('d0000000-0000-4000-8000-000000000002', 'KYC-DOC-REUPLOAD', 'Document re-upload', 'Lets a user resubmit corrected documents when asked.', 'kyc', 5, false, true),
  ('d0000000-0000-4000-8000-000000000003', 'SVC-WALLET-VIEW', 'Service wallet view', 'Shows the service balance and history for the user.', 'services', 5, true, true),
  ('d0000000-0000-4000-8000-000000000004', 'SVC-SUPPORT-CHAT', 'Support chat', 'In-app messaging with the support team.', 'services', 5, false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_entitlements (id, app_user_id, package_id, feature_id, payment_status, status, is_demo) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', NULL, 'demo_paid', 'active', true),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', NULL, 'd0000000-0000-4000-8000-000000000001', 'demo_paid', 'active', true),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', NULL, 'demo_unpaid', 'active', true),
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', NULL, 'd0000000-0000-4000-8000-000000000003', 'demo_unpaid', 'active', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.support_tickets (id, ticket_no, app_user_id, requester_name, category, subject, message, priority, status, is_demo, created_at, updated_at) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'TK-2001', 'b0000000-0000-4000-8000-000000000001', 'Arjun Mehta', 'complaint', 'Status not updated', 'My registration status has not changed for three days.', 'high', 'open', true, now() - interval '2 days', now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000002', 'TK-2002', 'b0000000-0000-4000-8000-000000000002', 'Anita Das', 'payment', 'Demo package payment question', 'I want to know whether the demo package payment was recorded.', 'normal', 'in_progress', true, now() - interval '1 day', now() - interval '6 hours'),
  ('f0000000-0000-4000-8000-000000000003', 'TK-2003', NULL, 'Mohammed Irfan', 'kyc_query', 'Help with correction request', 'Please explain which address detail needs to be corrected.', 'normal', 'waiting_user', true, now() - interval '2 days', now() - interval '2 days'),
  ('f0000000-0000-4000-8000-000000000004', 'TK-2004', 'b0000000-0000-4000-8000-000000000003', 'Vikram Singh', 'technical', 'Service wallet not loading', 'The wallet page shows a blank screen on my phone.', 'low', 'resolved', true, now() - interval '5 days', now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ticket_replies (id, ticket_id, author_id, author_name, body, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', NULL, 'Support Team (demo)', 'Thank you for your message. We are checking the payment record and will update you shortly.', now() - interval '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.security_alerts (id, severity, title, body, is_resolved, is_demo, created_at) VALUES
  ('f2000000-0000-4000-8000-000000000001', 'warning', 'Repeated failed sign-in attempts (demo)', 'Five failed sign-in attempts were recorded for an administrator account within ten minutes.', false, true, now() - interval '1 day'),
  ('f2000000-0000-4000-8000-000000000002', 'info', 'Password reset requested (demo)', 'A password reset was requested for user MU-100011.', false, true, now() - interval '1 day'),
  ('f2000000-0000-4000-8000-000000000003', 'info', 'KYC app connection not configured (demo)', 'The KYC application connection has no base address yet.', true, true, now() - interval '10 days')
ON CONFLICT (id) DO NOTHING;

UPDATE public.security_alerts SET resolved_at = now() - interval '9 days' WHERE id = 'f2000000-0000-4000-8000-000000000003' AND resolved_at IS NULL;

INSERT INTO public.audit_logs (actor_name, action, entity_type, entity_id, summary, created_at) VALUES
  ('System (demo)', 'registration.approved', 'registration_request', 'Arjun Mehta', 'Arjun Mehta: approved', now() - interval '18 days'),
  ('System (demo)', 'user_id.issued', 'app_user', 'MU-100010', 'Issued MU-100010 to Arjun Mehta', now() - interval '16 days'),
  ('System (demo)', 'account.suspended', 'app_user', 'MU-100011', 'MU-100011 status set to suspended', now() - interval '3 days'),
  ('System (demo)', 'ticket.replied', 'support_ticket', 'TK-2002', 'TK-2002 set to in_progress', now() - interval '6 hours');

INSERT INTO public.integration_settings (app_key, display_name, base_url, secret_names, connection_status, notes) VALUES
  ('kyc', 'Application 1: Registration and KYC status', NULL, ARRAY['KYC_APP_API_KEY'], 'not_configured', 'Not connected. Connect only after the provider integration is authorized.'),
  ('services', 'Application 2: User services and features', NULL, ARRAY['SERVICES_APP_API_KEY'], 'not_configured', 'Not connected. Connect only after the provider integration is authorized.')
ON CONFLICT (app_key) DO NOTHING;
