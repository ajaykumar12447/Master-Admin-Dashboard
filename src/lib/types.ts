export type AccessStatus = 'pending' | 'approved' | 'blocked';

export interface AccessRequest {
  user_id: string;
  email: string;
  status: AccessStatus;
  decided_role: Exclude<AdminRole, 'owner'> | null;
  decided_at: string | null;
  created_at: string;
}

export type AdminRole = 'owner' | 'admin' | 'support' | 'viewer';
export type AppKey = 'kyc' | 'services';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'correction_requested';
export type AccountStatus = 'active' | 'suspended' | 'deactivated';
export type PaymentStatus = 'demo_unpaid' | 'demo_paid';
export type EntitlementStatus = 'active' | 'expired' | 'cancelled';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketCategory = 'complaint' | 'kyc_query' | 'payment' | 'technical' | 'other';
export type TicketPriority = 'low' | 'normal' | 'high';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Registration {
  id: string;
  applicant_name: string;
  email: string;
  mobile: string;
  city: string | null;
  submitted_at: string;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  is_demo: boolean;
}

export interface AppUser {
  id: string;
  user_code: string;
  full_name: string;
  email: string;
  mobile: string;
  city: string | null;
  account_status: AccountStatus;
  registration_request_id: string | null;
  user_id_issued_at: string;
  password_reset_requested_at: string | null;
  is_demo: boolean;
}

export interface Package {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_inr: number;
  is_active: boolean;
  is_demo: boolean;
}

export interface Feature {
  id: string;
  code: string;
  name: string;
  description: string | null;
  app_target: AppKey;
  price_inr: number;
  is_enabled: boolean;
  is_demo: boolean;
}

export interface Entitlement {
  id: string;
  app_user_id: string;
  package_id: string | null;
  feature_id: string | null;
  payment_status: PaymentStatus;
  status: EntitlementStatus;
  is_demo: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_no: string;
  app_user_id: string | null;
  requester_name: string;
  category: TicketCategory;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  is_resolved: boolean;
  resolved_at: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
}

export interface AdminAccount {
  user_id: string;
  role: AdminRole;
  display_name: string;
  created_at: string;
}

export interface HelplineInput {
  name: string;
  contact: string;
  category: TicketCategory;
  subject: string;
  message: string;
}

export type ApplicationService = 'pan' | 'voter_id';
export type ApplicationType = 'new' | 'correction';
export type ApplicationStatus = 'submitted' | 'in_review' | 'completed' | 'rejected';

export interface ServiceApplication {
  id: string;
  ticket_no: string;
  service: ApplicationService;
  application_type: ApplicationType;
  applicant_name: string;
  mobile: string;
  email: string | null;
  city: string;
  state: string;
  status: ApplicationStatus;
  created_at: string;
}

export interface ServiceApplicationInput {
  service: ApplicationService;
  applicationType: ApplicationType;
  name: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  documentsConsent: boolean;
}

export interface IntegrationSetting {
  app_key: AppKey;
  display_name: string;
  base_url: string | null;
  secret_names: string[];
  connection_status: 'not_configured' | 'configured';
  notes: string | null;
  updated_at: string;
}
