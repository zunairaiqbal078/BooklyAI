export type UserRole = "CUSTOMER" | "BUSINESS";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  businessId: string | null;
  onboardingComplete: boolean | null;
}

export type BusinessCategory =
  | "SALON"
  | "CLINIC"
  | "SPA"
  | "WELLNESS"
  | "FITNESS"
  | "OTHER";


export interface Appointment {
  id: string;
  businessName: string;
  service: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
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
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
