// ─────────────────────────────────────────────
// WhatsApp Cloud API — Webhook Payload Types
// Based on Meta's official webhook documentation
// ─────────────────────────────────────────────

// ── Top-level webhook payload ──────────────────
export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string; // WABA ID
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: WebhookField;
}

export type WebhookField =
  | "account_alerts"
  | "account_review_update"
  | "account_update"
  | "business_capacity_update"
  | "message_template_quality_update"
  | "message_template_status_update"
  | "messages"
  | "phone_number_name_update"
  | "phone_number_quality_update"
  | "security"
  | "template_category_update";

// ── Messages field ─────────────────────────────
export interface WhatsAppChangeValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  errors?: WhatsAppError[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  id: string;           // wamid
  from: string;         // sender phone number
  timestamp: string;    // Unix timestamp string
  type: WhatsAppMessageType;
  text?: { body: string };
  image?: WhatsAppMedia;
  video?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  document?: WhatsAppMedia & { filename?: string };
  sticker?: WhatsAppMedia;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: Array<{
    name: { formatted_name: string };
    phones?: Array<{ phone: string; type: string }>;
  }>;
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  button?: { text: string; payload: string };
  context?: { from: string; id: string };
}

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "button"
  | "unknown";

export interface WhatsAppMedia {
  id: string;
  mime_type: string;
  sha256: string;
  caption?: string;
}

export interface WhatsAppStatus {
  id: string;             // wamid
  recipient_id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errors?: WhatsAppError[];
}

export interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details: string };
}

// ── Account event fields ───────────────────────
export interface AccountAlertPayload {
  alert_severity: "WARNING" | "CRITICAL";
  alert_status: "RESOLVED" | "ACTIVE";
  alert_type: string;
  entity_type: string;
  entity_id: string;
  entity_body: Record<string, unknown>;
}

export interface AccountReviewUpdatePayload {
  decision: "APPROVED" | "REJECTED";
  entity_type: string;
  entity_id: string;
}

export interface PhoneNumberQualityUpdatePayload {
  display_phone_number: string;
  phone_number_id: string;
  current_limit: string;
  previous_limit: string;
}

export interface MessageTemplateStatusUpdatePayload {
  event: "APPROVED" | "REJECTED" | "FLAGGED" | "PAUSED" | "DISABLED";
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  reason?: string;
}

// ── API Request/Response types ─────────────────

export interface ImportCredentialsRequest {
  businessName: string;
  appId: string;
  appSecret: string;
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ── Auth types ────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  businessId?: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  business?: {
    id: string;
    name: string;
    slug: string;
  };
}
