/*
# Private document uploads for PAN and Voter ID applications

1. Plain-English summary
- Applicants can attach up to 2 scanned documents (JPEG, PNG or PDF, 2 MB each) to their application.
- Attaching documents requires the applicant to tick a consent box. The time of consent is recorded.
- Files are stored in a private bucket. Nobody can view or list them through the public site.
- Only signed-in administrators can view or delete files, and they see them through short-lived links.

2. Changes
- service_applications: new column documents_consent_at (time the applicant consented to document storage, empty if none).
- submit_service_application: now takes a document consent flag. It returns the same reference number as before and records the consent time when the flag is true. The previous version is removed so the consent-free path cannot be used.
- New private storage bucket "service-documents" (not public, 2 MB limit, JPEG, PNG and PDF only).
- New function service_document_upload_allowed: decides whether an upload is accepted. It requires a real application, recorded consent, an application created within the last 24 hours, a file path in the expected format, and fewer than 2 files already stored for that application.

3. Security
- Public visitors can only add files, and only through the upload rule above. They cannot list, read, overwrite or delete files.
- Administrators can read and list files. Administrators with the owner or admin role can also delete files.
- The upload check runs under a per-application lock so parallel uploads cannot exceed the 2-file limit.

4. Important notes
- Stored files are not deleted automatically. Retention and deletion schedules still need to be set by the operator.
- Viewing a document is not logged yet.
*/

ALTER TABLE public.service_applications ADD COLUMN IF NOT EXISTS documents_consent_at timestamptz;

DROP FUNCTION IF EXISTS public.submit_service_application(text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_service_application(
  p_service text,
  p_application_type text,
  p_name text,
  p_mobile text,
  p_email text,
  p_city text,
  p_state text,
  p_documents_consent boolean
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

  INSERT INTO public.service_applications (ticket_no, service, application_type, applicant_name, mobile, email, city, state, documents_consent_at)
  VALUES (v_ticket_no, p_service, p_application_type, v_name, v_mobile, v_email, v_city, v_state,
          CASE WHEN coalesce(p_documents_consent, false) THEN now() END);

  RETURN v_ticket_no;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_service_application(text, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_service_application(text, text, text, text, text, text, text, boolean) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('service-documents', 'service-documents', false, 2097152, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

CREATE OR REPLACE FUNCTION public.service_document_upload_allowed(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket text := split_part(p_object_name, '/', 1);
  v_app_id uuid;
  v_existing integer;
BEGIN
  IF p_object_name !~ '^APP-[0-9]{6}-[A-F0-9]{6}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|pdf)$' THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('service_document:' || v_ticket));

  SELECT id INTO v_app_id
  FROM public.service_applications
  WHERE ticket_no = v_ticket
    AND documents_consent_at IS NOT NULL
    AND created_at > now() - interval '24 hours';
  IF v_app_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_existing
  FROM storage.objects
  WHERE bucket_id = 'service-documents' AND starts_with(name, v_ticket || '/');

  RETURN v_existing < 2;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.service_document_upload_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_document_upload_allowed(text) TO anon, authenticated;

DROP POLICY IF EXISTS "public_upload_service_documents" ON storage.objects;
CREATE POLICY "public_upload_service_documents" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'service-documents' AND public.service_document_upload_allowed(name));

DROP POLICY IF EXISTS "admin_read_service_documents" ON storage.objects;
CREATE POLICY "admin_read_service_documents" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'service-documents' AND public.admin_role() IS NOT NULL);

DROP POLICY IF EXISTS "admin_delete_service_documents" ON storage.objects;
CREATE POLICY "admin_delete_service_documents" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-documents' AND public.admin_role() IN ('owner', 'admin'));
