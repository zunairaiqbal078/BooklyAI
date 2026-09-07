export type UserRole = "CUSTOMER" | "BUSINESS";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface AiStructuredIntent {
  intent:
    | "book_appointment"
    | "list_appointments"
    | "cancel_appointment"
    | "check_availability"
    | "small_talk"
    | "unknown";
  service: string | null;
  date: string | null;
  time: string | null;
  businessId: string | null;
  confidence: number;
  missingFields: string[];
  reply: string;
}
