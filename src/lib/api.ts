import { supabase } from '@/lib/supabase';
import { DOCUMENT_BUCKET, documentPath } from '@/lib/serviceDocuments';
import type {
  AccessRequest,
  HelplineInput,
  ServiceApplication,
  ServiceApplicationInput,
  AdminAccount,
  AppKey,
  AppUser,
  AuditLog,
  Entitlement,
  Feature,
  IntegrationSetting,
  Package,
  Registration,
  SecurityAlert,
  Ticket,
  TicketReply,
  TicketStatus,
  AccountStatus,
  ReviewStatus,
} from '@/lib/types';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

async function unwrap<T>(query: PromiseLike<QueryResult<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('Empty response from server');
  return data;
}

export const adminApi = {
  registrations: () =>
    unwrap<Registration[]>(
      supabase.from('registration_requests').select('*').order('submitted_at', { ascending: false }),
    ),

  appUsers: () =>
    unwrap<AppUser[]>(supabase.from('app_users').select('*').order('user_id_issued_at', { ascending: false })),

  packages: () => unwrap<Package[]>(supabase.from('packages').select('*').order('price_inr', { ascending: true })),

  features: () =>
    unwrap<Feature[]>(supabase.from('features').select('*').order('price_inr', { ascending: true })),

  entitlements: () =>
    unwrap<Entitlement[]>(supabase.from('user_entitlements').select('*').order('created_at', { ascending: false })),

  tickets: () =>
    unwrap<Ticket[]>(supabase.from('support_tickets').select('*').order('created_at', { ascending: false })),

  ticketReplies: () =>
    unwrap<TicketReply[]>(supabase.from('ticket_replies').select('*').order('created_at', { ascending: true })),

  alerts: () =>
    unwrap<SecurityAlert[]>(supabase.from('security_alerts').select('*').order('created_at', { ascending: false })),

  auditLogs: () =>
    unwrap<AuditLog[]>(supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)),

  admins: () =>
    unwrap<AdminAccount[]>(supabase.from('admin_users').select('*').order('created_at', { ascending: true })),

  integrations: () =>
    unwrap<IntegrationSetting[]>(supabase.from('integration_settings').select('*').order('app_key', { ascending: true })),

  accessRequests: () =>
    unwrap<AccessRequest[]>(supabase.from('account_access_requests').select('*').order('created_at', { ascending: false })),

  submitHelpline: async (input: HelplineInput) => {
    const { data, error } = await supabase.rpc('submit_helpline_request', {
      p_name: input.name,
      p_contact: input.contact,
      p_category: input.category,
      p_subject: input.subject,
      p_message: input.message,
    });
    if (error) throw new Error(error.message);
    if (typeof data !== 'string') throw new Error('Unexpected response from server');
    return data;
  },

  serviceApplications: () =>
    unwrap<ServiceApplication[]>(
      supabase.from('service_applications').select('*').order('created_at', { ascending: false }).limit(200),
    ),

  submitServiceApplication: async (input: ServiceApplicationInput) => {
    const { data, error } = await supabase.rpc('submit_service_application', {
      p_service: input.service,
      p_application_type: input.applicationType,
      p_name: input.name,
      p_mobile: input.mobile,
      p_email: input.email,
      p_city: input.city,
      p_state: input.state,
      p_documents_consent: input.documentsConsent,
    });
    if (error) throw new Error(error.message);
    if (typeof data !== 'string') throw new Error('Unexpected response from server');
    return data;
  },

  uploadServiceDocument: async (ticketNo: string, file: File) => {
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(documentPath(ticketNo, file), file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error('Could not upload this document.');
  },

  listServiceDocuments: async (ticketNo: string) => {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).list(ticketNo, { limit: 10 });
    if (error || !data) throw new Error('Could not load the documents.');
    return data.filter((item) => item.id !== null).map((item) => `${ticketNo}/${item.name}`);
  },

  serviceDocumentLink: async (path: string) => {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 300);
    if (error || !data) throw new Error('Could not open this document.');
    return data.signedUrl;
  },

  reviewAccessRequest: async (userId: string, decision: 'approved' | 'blocked', role: 'admin' | 'support' | 'viewer' | null) => {
    const { error } = await supabase.rpc('review_access_request', {
      p_user_id: userId,
      p_decision: decision,
      p_role: role,
    });
    if (error) throw new Error(error.message);
  },

  reviewRegistration: async (requestId: string, decision: ReviewStatus, note: string) => {
    const { error } = await supabase.rpc('review_registration', {
      p_request_id: requestId,
      p_decision: decision,
      p_note: note,
    });
    if (error) throw new Error(error.message);
  },

  issueUserId: async (requestId: string) => {
    const { data, error } = await supabase.rpc('issue_user_id', { p_request_id: requestId });
    if (error) throw new Error(error.message);
    if (typeof data !== 'string') throw new Error('Unexpected response from server');
    return data;
  },

  setAccountStatus: async (appUserId: string, status: AccountStatus) => {
    const { error } = await supabase.rpc('set_account_status', { p_app_user_id: appUserId, p_status: status });
    if (error) throw new Error(error.message);
  },

  requestPasswordReset: async (appUserId: string) => {
    const { error } = await supabase.rpc('request_password_reset', { p_app_user_id: appUserId });
    if (error) throw new Error(error.message);
  },

  setFeatureEnabled: async (featureId: string, enabled: boolean) => {
    const { error } = await supabase.rpc('set_feature_enabled', { p_feature_id: featureId, p_enabled: enabled });
    if (error) throw new Error(error.message);
  },

  replyToTicket: async (ticketId: string, body: string, status: TicketStatus) => {
    const { error } = await supabase.rpc('reply_to_ticket', {
      p_ticket_id: ticketId,
      p_body: body,
      p_status: status,
    });
    if (error) throw new Error(error.message);
  },

  resolveAlert: async (alertId: string) => {
    const { error } = await supabase.rpc('resolve_security_alert', { p_alert_id: alertId });
    if (error) throw new Error(error.message);
  },

  updateIntegration: async (appKey: AppKey, baseUrl: string, notes: string) => {
    const { error } = await supabase.rpc('update_integration_settings', {
      p_app_key: appKey,
      p_base_url: baseUrl,
      p_notes: notes,
    });
    if (error) throw new Error(error.message);
  },
};
