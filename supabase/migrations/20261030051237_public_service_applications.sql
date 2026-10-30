/*
# Public PAN and Voter ID application intake

1. Plain-English summary
- Visitors can apply for a PAN card or a Voter ID (new or correction) from the public website. Each application gets a reference number and appears on the admin Support page.
- No government identity numbers (PAN, Aadhaar, Voter ID number), dates of birth, or documents are collected. The form only takes contact and location details.

2. New tables
- service_applications: one row per application.
  - id (uuid, primary key)
  - ticket_no (text, unique reference such as APP-261030-A1B2C3)
  - service ('pan' or 'voter_id')
  - application_type ('new' or 'correction')
  - applicant_name, mobile (10 digits, starts 6 to 9), email (optional), city, state
  - status ('submitted', 'in_review', 'completed', 'rejected'), default 'submitted'
  - created_at (timestamp)

3. New functions
- submit_service_application: public function that validates the form, stores the application and returns its reference number.

4. Security
- Row level security is enabled on service_applications.
- Visitors (anonymous and signed-in) have no direct table access. They can only call submit_service_application.
- Signed-in administrators can read applications through a policy that requires an admin role.
- No write privileges are granted to the browser on the table.

5. Important notes
- Demo intake only. It does not submit anything to the PAN or Voter ID authorities.
*/

CREATE TABLE IF NOT EXISTS public.service_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL UNIQUE,
  service text NOT NULL CHECK (service IN ('pan', 'voter_id')),
  application_type text NOT NULL CHECK (application_type IN ('new', 'correction')),
  applicant_name text NOT NULL CHECK (char_length(applicant_name) BETWEEN 2 AND 100),
  mobile text NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  email text CHECK (email IS NULL OR char_length(email) BETWEEN 5 AND 120),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  state text NOT NULL CHECK (char_length(state) BETWEEN 2 AND 80),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_applications_created_at_idx ON public.service_applications (created_at DESC);

ALTER TABLE public.service_applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.service_applications TO authenticated;

DROP POLICY IF EXISTS "admin_read_service_applications" ON public.service_applications;
CREATE POLICY "admin_read_service_applications" ON public.service_applications FOR SELECT TO authenticated
  USING (public.admin_role() IS NOT NULL);

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

  v_ticket_no := 'APP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.service_applications (ticket_no, service, application_type, applicant_name, mobile, email, city, state)
  VALUES (v_ticket_no, p_service, p_application_type, v_name, v_mobile, v_email, v_city, v_state);

  RETURN v_ticket_no;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_service_application(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_service_application(text, text, text, text, text, text, text) TO anon, authenticated;
