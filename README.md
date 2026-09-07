<div align="center">

#  BooklyAI

**Intelligent, Conversational Appointment Booking Platform with Zero Double-Bookings**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Mistral AI](https://img.shields.io/badge/Mistral_AI-Integrated-FD6F00?style=for-the-badge&logo=ai&logoColor=white)](https://mistral.ai/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

<br />

<p align="center">
  <b>BooklyAI</b> bridges the gap between natural language convenience and deterministic scheduling precision. Customers schedule appointments naturally through an intelligent conversational assistant or structured forms, while businesses gain full control over their calendar, availability rules, and service catalog with guaranteed zero overlap.
</p>

[Key Features](#-key-features) •
[Architecture](#-system-architecture) •
[Tech Stack](#-tech-stack) •
[Quick Start](#-quick-start) •
[Demo Credentials](#-demo-credentials) •
[API Reference](#-api-reference)

</div>

---

## ✨ Key Features

### 🤖 Intelligent AI Booking Assistant
- **Natural Language Scheduling:** Powered by Mistral AI to parse intents, extract dates, times, and preferred services directly from natural conversation.
- **Multi-Turn Memory:** Preserves conversational context across messages, maintaining ongoing draft states without losing information.
- **Fail-Safe Deterministic Fallback:** If the AI service is unavailable or lacks API keys, a deterministic heuristic parser seamlessly takes over, ensuring zero downtime for customers.
- **Real Availability Enforcement:** The LLM **never** hallucinates open slots or interacts with the database directly. All slot options originate from real business calendar availability rules.

### 🛡️ Strict Overlap & Conflict Prevention
- **Zero Double-Bookings:** Enforces atomic slot verification using the interval conflict formula (`startA < endB && endA > startB`).
- **Dynamic Weekly Rules:** Configurable recurring availability rules per business (e.g., Mon–Fri, 09:00–17:00, 30-minute intervals).
- **Automated Reclaiming:** Cancelled or completed appointments immediately restore availability to the public calendar.

### 🔐 Enterprise-Grade Security & Authentication
- **HttpOnly Cookie Sessions:** JWT authentication stored securely in `HttpOnly`, `SameSite` cookies. Zero exposure to client-side JavaScript or `localStorage` to prevent XSS attacks.
- **Role-Based Access Control (RBAC):** Distinct workflows and guarded routes for `CUSTOMER` and `BUSINESS` users.
- **Data Protection:** Robust bcrypt password hashing, request rate-limiting, Helmet security headers, and strict Zod payload validation.

### 🏢 Business Management Suite
- **Interactive Calendar:** Visual, role-aware monthly and daily calendar views highlighting confirmed, pending, and completed appointments.
- **Service Catalog Management:** Create and manage distinct bookable services with customized duration, descriptions, and active status.
- **Business Operations:** Complete visibility into bookings, customer profiles, and schedule constraints.

### 🗓️ Customer Portal
- **Conversational & Traditional Booking:** Choose between chat-based assistant scheduling with quick-prompt chips or a high-speed fallback form.
- **Appointment Lifecycle:** View upcoming and past appointments with real-time status badges and one-click cancellation.

### 🎨 Editorial Design System
- **Warm Light-Theme Aesthetic:** Warm parchment canvas, sage and deep teal accents, refined typography with `Instrument Sans` and `Newsreader`.
- **Responsive & Accessible:** Fluid layouts optimized for desktop, tablet, and mobile with bottom-navigation integration.

---

## 🏛️ System Architecture

BooklyAI strictly decouples AI natural language interpretation from database mutations and calendar constraint validation:

```
                            ┌────────────────────────────────────────┐
                            │           Browser Client               │
                            │   Next.js 16 (App Router + React 19)   │
                            └───────────────────┬────────────────────┘
                                                │ Credentials: 'include' (HttpOnly Cookie)
                                                ▼
                            ┌────────────────────────────────────────┐
                            │          Express REST API              │
                            │  Security, Rate Limiting & Validation  │
                            └───────┬───────────────┬────────────────┘
                                    │               │
                     ┌──────────────┴────┐     ┌────┴──────────────┐
                     ▼                   ▼     ▼                   ▼
             ┌───────────────┐   ┌─────────────────┐       ┌───────────────┐
             │ Auth Service  │   │ Appt Service    │       │ Chat Service  │
             │ (JWT / Bcrypt)│   │ (Overlap Check) │       │ (Memory/Draft)│
             └───────┬───────┘   └────────┬────────┘       └───────┬───────┘
                     │                    │                        │
                     │           ┌────────┴────────┐               ▼
                     │           ▼                 ▼       ┌───────────────┐
                     │   ┌───────────────┐ ┌─────────────┐ │  AI Service   │
                     │   │ Availability  │ │ Business    │ │ (Mistral API  │
                     │   │ Engine        │ │ Services    │ │  + Heuristic) │
                     │   └───────┬───────┘ └──────┬──────┘ └───────┬───────┘
                     │           │                │                │
                     └───────────┼────────────────┼────────────────┘
                                 ▼                ▼
                            ┌────────────────────────────────────────┐
                            │               Prisma ORM               │
                            └───────────────────┬────────────────────┘
                                                ▼
                            ┌────────────────────────────────────────┐
                            │        PostgreSQL Database             │
                            └────────────────────────────────────────┘
```

> **Design Principle:** The AI never talks directly to Prisma or invents slots. The chat service asks the AI for structured intent, and the backend availability engine applies strict domain rules.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Zustand](https://github.com/pmndrs/zustand), [clsx](https://github.com/lukeed/clsx) |
| **Backend** | [Node.js 20+](https://nodejs.org/), [Express 5](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/), [Zod](https://zod.dev/), [Pino](https://github.com/pinojs/pino), [Helmet](https://helmetjs.github.io/) |
| **Database & ORM** | [PostgreSQL 16](https://www.postgresql.org/), [Prisma ORM 6](https://www.prisma.io/), Docker Compose |
| **AI & NLP** | [Mistral AI API](https://mistral.ai/) (`mistral-small-latest`) with deterministic heuristic fallback parser |
| **Security** | HttpOnly Cookie JWT, Bcrypt password hashing, Express Rate Limit, CORS isolation |
| **Testing** | [Vitest](https://vitest.dev/), Supertest |

---

## 📁 Project Structure

```
BooklyAI/
├── BookLyAI-FE/                      # Next.js Frontend Application
│   ├── app/                          # App Router pages
│   │   ├── (auth)/                   # Login & Signup flows
│   │   ├── appointments/             # Appointment listing & details
│   │   ├── assistant/                # AI Conversational assistant UI
│   │   ├── calendar/                 # Role-aware interactive calendar
│   │   ├── dashboard/                # Business / Customer dashboard
│   │   ├── globals.css               # Design tokens & Tailwind CSS
│   │   └── page.tsx                  # Brand-forward landing page
│   ├── components/                   # UI components, layout, modals, chat
│   ├── constants/                    # Application routes & prompt suggestions
│   ├── features/                     # Feature-specific state and logic
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # HTTP client with credential forwarding
│   ├── stores/                       # Zustand client state stores
│   └── types/                        # TypeScript domain types
│
├── BooklyAI-BE/                      # Express Backend API
│   ├── docker-compose.yml            # Containerized PostgreSQL service
│   ├── prisma/
│   │   ├── schema.prisma             # Multi-tenant relational schema
│   │   ├── migrations/               # Versioned migration history
│   │   └── seed.ts                   # Comprehensive seed data script
│   ├── src/
│   │   ├── ai/                       # Mistral service, prompts, intent parser
│   │   ├── config/                   # Typed environment, logger, DB client
│   │   ├── middleware/               # Auth, rate-limiting, error handling
│   │   ├── modules/                  # Auth, Appointments, Availability, Chat
│   │   ├── types/                    # Shared backend interfaces & DTOs
│   │   ├── utils/                    # Time calculation, JWT, slug generators
│   │   ├── app.ts                    # Express application configuration
│   │   └── server.ts                 # Server entrypoint
│   └── vitest.config.ts              # Unit and integration test runner
│
├── .gitignore                        # Global monorepo ignore rules
└── README.md                         # Main documentation
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: For local PostgreSQL

---

### 1. Database Setup

Spin up the local PostgreSQL instance via Docker Compose:

```bash
cd BooklyAI-BE
docker compose up -d
```
*PostgreSQL will be running on `localhost:5433` (isolated from standard 5432 ports).*

---

### 2. Backend Setup

From the `BooklyAI-BE` directory:

```bash
# Copy sample environment configuration
cp .env.example .env

# Install backend dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Seed database with demo accounts, business rules, and services
npx prisma db seed

# Launch development server with live reload
npm run dev
```

- **API URL:** [http://localhost:4000](http://localhost:4000)
- **Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

---

### 3. Frontend Setup

In a new terminal, navigate to `BookLyAI-FE`:

```bash
cd BookLyAI-FE

# Copy environment configuration
cp .env.example .env.local

# Install frontend dependencies
npm install

# Launch Next.js Turbopack development server
npm run dev
```

- **Web Application:** [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Credentials

The database seed provides ready-to-test accounts for both platform roles:

| Role | Email | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@booklyai.dev` | `Demo1234!` | Conversational AI booking, upcoming appointments, appointment cancellation. |
| **Business Owner** | `business@booklyai.dev` | `Demo1234!` | Business dashboard, full calendar schedule, service configuration, conflict monitoring. |

> **Pre-seeded Business:** *Northside Wellness* (`northside-wellness`) with active consultation services, Monday–Friday availability (09:00–17:00), and sample booked appointments.

---

## 🔌 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register customer or business owner account | No |
| `POST` | `/api/auth/login` | Authenticate user & issue HttpOnly cookie | No |
| `POST` | `/api/auth/logout` | Clear authentication session cookie | Yes |
| `GET` | `/api/auth/me` | Retrieve current authenticated user profile | Yes |

### Appointments & Scheduling (`/api/appointments`, `/api/availability`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/availability` | Fetch available business time slots for a given date | No |
| `POST` | `/api/appointments` | Book an appointment with overlap conflict validation | Yes (Customer) |
| `GET` | `/api/appointments` | List appointments for authenticated user | Yes |
| `GET` | `/api/appointments/:id` | Get detailed information for a specific appointment | Yes |
| `PATCH` | `/api/appointments/:id/cancel` | Cancel an appointment and free the time slot | Yes |
| `GET` | `/api/calendar` | Retrieve calendar events within a date range | Yes |

### AI Conversational Assistant (`/api/chat`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/chat/sessions` | Initialize a new conversational booking session | Yes (Customer) |
| `GET` | `/api/chat/sessions/:id/messages`| Fetch complete conversation message history | Yes (Customer) |
| `POST` | `/api/chat/messages` | Send user message, execute AI intent extraction | Yes (Customer) |
| `POST` | `/api/chat/book` | Book directly via in-chat fallback form | Yes (Customer) |

### Catalog & Businesses (`/api/businesses`, `/api/services`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/businesses` | List all active businesses | No |
| `GET` | `/api/businesses/:id` | Get business details by ID or slug | No |
| `GET` | `/api/businesses/:id/services`| List bookable services for a business | No |
| `GET` | `/api/services` | List all available services | No |

---

## ⚙️ Environment Variables

### Backend (`BooklyAI-BE/.env`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `4000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5433/booklyai?schema=public` |
| `JWT_SECRET` | Secret key used to sign session JWTs (min 32 chars) | `your-secure-random-jwt-secret-min-32-chars` |
| `JWT_EXPIRES_IN_DAYS` | Token and cookie expiration period (days) | `7` |
| `AUTH_COOKIE_NAME` | Name of the HttpOnly session cookie | `booklyai_token` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `MISTRAL_API_KEY` | Mistral AI API key (optional: fallback parser active) | `your_mistral_api_key` |
| `MISTRAL_MODEL` | Target Mistral model | `mistral-small-latest` |

### Frontend (`BookLyAI-FE/.env.local`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Origin URL for the backend API | `http://localhost:4000` |

---

## 🧪 Testing & Validation

BooklyAI includes automated unit and integration tests verifying authentication, overlap prevention, availability generation, and AI intent parsing.

Run the test suite from `BooklyAI-BE`:

```bash
cd BooklyAI-BE
npm test
```

```
 ✓ src/modules/appointments/appointment.test.ts (7 tests)
 ✓ src/modules/auth/auth.test.ts (8 tests)
 ✓ src/modules/chat/chat.test.ts (3 tests)
 ✓ src/ai/ai.parser.test.ts (5 tests)
 ✓ src/utils/time.test.ts (3 tests)
 ✓ src/modules/auth/authorization.test.ts (3 tests)
 ✓ src/utils/jwt.test.ts (2 tests)
 ✓ src/modules/health/health.test.ts (1 test)
 ✓ src/utils/slug.test.ts (2 tests)

 Test Files  9 passed (9)
      Tests  34 passed (34)
```

To test the Next.js production build:

```bash
cd BookLyAI-FE
npm run build
```

---

## 📄 License

This project is licensed under the MIT License — feel free to explore, modify, and build upon it.

---

<div align="center">
  <sub>Built with ❤️ for intelligent scheduling. Designed with Next.js, Express, PostgreSQL, and Mistral AI.</sub>
</div>
