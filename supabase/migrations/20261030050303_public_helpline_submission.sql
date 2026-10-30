/*
# Public helpline submission

1. Plain-English summary
- Lets any visitor of the public website send a helpline request. Each request becomes a support ticket that appears on the admin Support page.

2. Changes
- support_tickets: new optional column "contact" holding the email or mobile the visitor gave.
- submit_helpline_request: new public function that validates the form, creates the ticket and returns its ticket number.

3. Security
- Visitors can only call the submit function; they cannot read or change any table.
- Inputs are trimmed and length-limited on the server, and the category must be one of the allowed values.
- The function is granted only to anonymous and signed-in visitors; no other table privileges are added.

4. Important notes
- Requests are demo data only. The form does not collect Aadhaar, PAN, bank or payment details.
*/

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS contact text;

CREATE OR REPLACE FUNCTION public.submit_helpline_request(
  p_name text,
  p_contact text,
  p_category text,
  p_subject text,
  p_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_subject text := btrim(coalesce(p_subject, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_ticket_no text;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your name (2 to 100 characters)';
  END IF;
  IF char_length(v_contact) < 5 OR char_length(v_contact) > 120 THEN
    RAISE EXCEPTION 'Please enter a valid email or mobile number';
  END IF;
  IF p_category NOT IN ('complaint', 'kyc_query', 'payment', 'technical', 'other') THEN
    RAISE EXCEPTION 'Please choose a category';
  END IF;
  IF char_length(v_subject) < 3 OR char_length(v_subject) > 150 THEN
    RAISE EXCEPTION 'Please enter a subject (3 to 150 characters)';
  END IF;
  IF char_length(v_message) < 10 OR char_length(v_message) > 2000 THEN
    RAISE EXCEPTION 'Please describe your question (10 to 2000 characters)';
  END IF;

  v_ticket_no := 'HLP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.support_tickets (ticket_no, requester_name, contact, category, subject, message, is_demo)
  VALUES (v_ticket_no, v_name, v_contact, p_category, v_subject, v_message, true);

  RETURN v_ticket_no;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_helpline_request(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_helpline_request(text, text, text, text, text) TO anon, authenticated;
