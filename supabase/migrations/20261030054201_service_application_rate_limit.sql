/*
# Rate limit for PAN and Voter ID applications

1. Plain-English summary
- One person can send at most 3 applications in any rolling 24-hour period.
- The limit applies to the mobile number and, when one is given, to the email address. Either limit being reached stops the submission.
- The check runs on the server, so it cannot be bypassed from the browser.

2. Changes
- service_applications: new index on (mobile, created_at) and (email, created_at) so the count stays fast.
- submit_service_application: now counts recent applications for the same mobile number and email before inserting. Over the limit, it returns a friendly message and stores nothing.

3. Security
- Submissions for the same mobile number are serialized with a transaction-scoped advisory lock, so parallel requests cannot slip past the limit.
- Function grants are unchanged: only anonymous and signed-in visitors may call it.

4. Important notes
- The limit uses the mobile number and email the visitor types in, so it stops repeat submissions from one person but not someone who deliberately uses many numbers and addresses. A per-network limit would need the request source address, which is not stored.
*/

CREATE INDEX IF NOT EXISTS service_applications_mobile_created_idx ON public.service_applications (mobile, created_at DESC);
CREATE INDEX IF NOT EXISTS service_applications_email_created_idx ON public.service_applications (email, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_service_application(
  p_service text,
  p_application_type text,
  p_name text,
  p_mobile text,
  p_email text,
  p_city text,
  p_state text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_mobile text := regexp_replace(coalesce(p_mobile, ''), '\s', '', 'g');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_city text := btrim(coalesce(p_city, ''));
  v_state text := btrim(coalesce(p_state, ''));
  v_ticket_no text;
  v_limit constant integer := 3;
  v_recent integer;
BEGIN
  IF p_service NOT IN ('pan', 'voter_id') THEN
    RAISE EXCEPTION 'Please choose a service';
  END IF;
  IF p_application_type NOT IN ('new', 'correction') THEN
    RAISE EXCEPTION 'Please choose an application type';
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your name (2 to 100 characters)';
  END IF;
  IF v_mobile !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Please enter a valid 10-digit mobile number';
  END IF;
  IF v_email IS NOT NULL AND (char_length(v_email) > 120 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF char_length(v_city) < 2 OR char_length(v_city) > 80 THEN
    RAISE EXCEPTION 'Please enter your city';
  END IF;
  IF char_length(v_state) < 2 OR char_length(v_state) > 80 THEN
    RAISE EXCEPTION 'Please enter your state';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('service_application:' || v_mobile));

  SELECT count(*) INTO v_recent
  FROM public.service_applications
  WHERE mobile = v_mobile AND created_at > now() - interval '24 hours';
  IF v_recent >= v_limit THEN
    RAISE EXCEPTION 'This mobile number has reached the limit of % applications in 24 hours. Please try again later.', v_limit;
  END IF;

  IF v_email IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM public.service_applications
    WHERE email = v_email AND created_at > now() - interval '24 hours';
    IF v_recent >= v_limit THEN
      RAISE EXCEPTION 'This email address has reached the limit of % applications in 24 hours. Please try again later.', v_limit;
    END IF;
  END IF;

  v_ticket_no := 'APP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.service_applications (ticket_no, service, application_type, applicant_name, mobile, email, city, state)
  VALUES (v_ticket_no, p_service, p_application_type, v_name, v_mobile, v_email, v_city, v_state);

  RETURN v_ticket_no;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_service_application(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_service_application(text, text, text, text, text, text, text) TO anon, authenticated;
