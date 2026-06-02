# CareSync — Cloud-Native Hospital Appointment & Records System

> A production-ready full-stack monolithic application built with AWS migration readiness from Day 1. Every external integration uses a provider abstraction — migrating to AWS requires only adding new provider implementations, never touching business logic.

---

## 1. Project Overview

CareSync is a hospital management system supporting three user roles:
- **Patients** — book appointments, view medical records, upload documents
- **Doctors** — manage appointments, create medical notes and prescriptions
- **Admins** — manage users, doctors, patients, and view audit trails

The architecture is intentionally simple but strategically structured to support a full AWS cloud deployment journey: from local Docker → EC2 → RDS → S3 → SNS → EventBridge → SQS → Lambda → CloudFront → Terraform.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CareSync System                          │
├──────────────┬──────────────────────────┬──────────────────────┤
│   Frontend   │        Backend           │      Database        │
│  React+Vite  │   Node.js + Express      │    PostgreSQL        │
│  TypeScript  │   TypeScript             │    via Prisma ORM    │
│  Tailwind    │   JWT Auth + RBAC        │                      │
│  Port: 80    │   Port: 3000             │    Port: 5432        │
└──────────────┴──────────────────────────┴──────────────────────┘

Provider Pattern (AWS Migration Layer):
  StorageProvider    → Local Disk        → [Future] S3
  NotificationProvider → Database        → [Future] SNS
  EventProvider      → Console           → [Future] EventBridge
  QueueProvider      → In-Memory         → [Future] SQS
```

### Request Flow
```
Browser → Nginx (80) → React SPA
         → /api/* proxy → Express (3000) → Prisma → PostgreSQL
                                         → StorageProvider → Local/S3
                                         → NotificationProvider → DB/SNS
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 3 |
| Backend | Node.js 20, Express 4, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Authentication | JWT (access + refresh tokens), bcrypt |
| Containerization | Docker, Docker Compose |
| API Docs | Swagger UI (swagger-jsdoc + swagger-ui-express) |
| Validation | Zod |
| File Upload | Multer (memory storage) |

---

## 4. Folder Structure

```
monolith/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                  # Axios API modules
│   │   │   ├── client.ts         # Axios instance + interceptors
│   │   │   ├── auth.ts
│   │   │   ├── appointments.ts
│   │   │   ├── patients.ts
│   │   │   ├── doctors.ts
│   │   │   ├── records.ts
│   │   │   ├── documents.ts
│   │   │   ├── notifications.ts
│   │   │   └── admin.ts
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Layout.tsx    # Main layout wrapper
│   │   │   │   ├── Sidebar.tsx   # Role-based navigation
│   │   │   │   └── Navbar.tsx    # Header + notifications
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── patient/
│   │   │   │   ├── PatientDashboard.tsx
│   │   │   │   ├── PatientAppointments.tsx
│   │   │   │   ├── PatientRecords.tsx
│   │   │   │   └── PatientDocuments.tsx
│   │   │   ├── doctor/
│   │   │   │   ├── DoctorDashboard.tsx
│   │   │   │   ├── DoctorAppointments.tsx
│   │   │   │   └── DoctorRecords.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── AdminUsers.tsx
│   │   │   │   ├── AdminAppointments.tsx
│   │   │   │   └── AdminAuditLogs.tsx
│   │   │   └── NotFound.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── .env.example
│   ├── nginx.conf
│   └── Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts       # Prisma client singleton
│   │   │   ├── swagger.ts        # OpenAPI 3.0 spec
│   │   │   └── providers.ts      # Provider registry (AWS migration point)
│   │   ├── controllers/          # HTTP handlers (8 modules)
│   │   │   ├── auth.controller.ts
│   │   │   ├── patient.controller.ts
│   │   │   ├── doctor.controller.ts
│   │   │   ├── appointment.controller.ts
│   │   │   ├── medicalRecord.controller.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   └── admin.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # JWT validation
│   │   │   ├── role.middleware.ts     # RBAC
│   │   │   ├── error.middleware.ts    # Global error handler
│   │   │   └── upload.middleware.ts   # Multer (memory storage)
│   │   ├── providers/
│   │   │   ├── interfaces/            # Provider contracts
│   │   │   │   ├── StorageProvider.ts
│   │   │   │   ├── NotificationProvider.ts
│   │   │   │   ├── EventProvider.ts
│   │   │   │   └── QueueProvider.ts
│   │   │   └── implementations/       # Local implementations
│   │   │       ├── LocalStorageProvider.ts
│   │   │       ├── DatabaseNotificationProvider.ts
│   │   │       ├── ConsoleEventProvider.ts
│   │   │       └── LocalQueueProvider.ts
│   │   ├── routes/               # Express routers with Swagger JSDoc (8 files)
│   │   ├── services/             # Business logic layer (8 modules)
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts            # Sign/verify tokens
│   │   │   ├── audit.ts          # Audit log writer
│   │   │   └── validators.ts     # Zod schemas
│   │   ├── app.ts                # Express application setup
│   │   └── server.ts             # Entry point with graceful shutdown
│   ├── prisma/
│   │   ├── schema.prisma         # 8 models + enums
│   │   ├── migrations/           # Generated by Prisma migrate
│   │   └── seed.ts               # Demo data seeding
│   ├── uploads/                  # Local file storage (via LocalStorageProvider)
│   │   └── documents/
│   ├── tsconfig.json
│   ├── package.json
│   ├── .env.example
│   ├── docker-entrypoint.sh      # Runs migrate + seed before starting
│   └── Dockerfile
│
├── docker-compose.yml
├── .gitignore
├── README.md
├── PROJECT_DOCUMENTATION.md
└── TESTING_GUIDE.md
```

---

## 5. Installation Guide

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (for local dev without Docker)
- Git

### Option A: Docker (Recommended)
```bash
git clone <repo-url> caresync
cd caresync

# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start everything
docker compose up -d --build

# Application will be available at:
# Frontend:    http://localhost:80
# Backend API: http://localhost:3000/api
# Swagger UI:  http://localhost:3000/api/docs
# Health:      http://localhost:3000/api/health
```

### Option B: Local Development
```bash
# 1. Start PostgreSQL (or use Docker)
docker run -d --name pg -e POSTGRES_DB=caresync_db -e POSTGRES_USER=caresync_user \
  -e POSTGRES_PASSWORD=caresync_pass -p 5432:5432 postgres:16-alpine

# 2. Backend setup
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## 6. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Access token secret (min 32 chars) | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `UPLOADS_DIR` | Local file storage path | `./uploads` |
| `MAX_FILE_SIZE_MB` | Max upload size | `10` |
| `STORAGE_PROVIDER` | `local` or `s3` | `local` |
| `NOTIFICATION_PROVIDER` | `database` or `sns` | `database` |
| `EVENT_PROVIDER` | `console` or `eventbridge` | `console` |
| `QUEUE_PROVIDER` | `local` or `sqs` | `local` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |

---

## 7. Database Setup

### Migrations
```bash
cd backend

# Development (creates migration files)
npx prisma migrate dev --name init

# Production (applies existing migrations)
npx prisma migrate deploy

# Reset database (development only)
npm run db:reset
```

### Schema (8 Tables)
| Table | Description |
|---|---|
| `users` | All users with role (ADMIN/DOCTOR/PATIENT) |
| `patients` | Patient profile linked to users |
| `doctors` | Doctor profile with specialization |
| `appointments` | Patient-Doctor appointments |
| `medical_records` | Doctor notes per appointment |
| `documents` | File metadata (file stored via StorageProvider) |
| `notifications` | System notifications per user |
| `audit_logs` | All system mutations |

---

## 8. Docker Setup

```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f
docker compose logs -f backend

# Stop services
docker compose down

# Remove all data (volumes)
docker compose down -v

# Rebuild single service
docker compose up -d --build backend

# Run seed manually
docker compose exec backend npx prisma db seed
```

### Health Checks
- **postgres**: `pg_isready` every 10s
- **backend**: `GET /api/health` every 30s (starts after postgres healthy)
- **frontend**: HTTP GET on port 80 every 30s (starts after backend healthy)

---

## 9. Local Development Setup

```bash
# Backend (hot reload with nodemon)
cd backend && npm run dev
# → http://localhost:3000

# Frontend (Vite HMR)
cd frontend && npm run dev
# → http://localhost:5173

# Prisma Studio (database GUI)
cd backend && npm run db:studio
# → http://localhost:5555
```

---

## 10. API Documentation Access

| URL | Description |
|---|---|
| `http://localhost:3000/api/docs` | Swagger UI (interactive) |
| `http://localhost:3000/api/docs-json` | OpenAPI 3.0 JSON spec |
| `http://localhost:3000/api/health` | Health check endpoint |

### Health Response
```json
{
  "status": "healthy",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## 11. Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@caresync.com` | `Admin@123` |
| **Doctor** | `dr.smith@caresync.com` | `Doctor@123` |
| **Doctor** | `dr.johnson@caresync.com` | `Doctor@123` |
| **Patient** | `patient1@caresync.com` | `Patient@123` |
| **Patient** | `patient2@caresync.com` | `Patient@123` |

> **Tip**: The login page has quick-fill buttons for Admin, Doctor, and Patient roles.

---

## 12. Troubleshooting Guide

### `docker compose up` fails — backend can't connect to database
```bash
# Check postgres health
docker compose ps
docker compose logs postgres

# Wait for postgres to be healthy, then retry
docker compose restart backend
```

### Migrations fail
```bash
# Check DATABASE_URL is correct
docker compose exec backend env | grep DATABASE_URL

# Run migrations manually
docker compose exec backend npx prisma migrate deploy
```

### Frontend shows blank page
```bash
# Check backend health
curl http://localhost:3000/api/health

# Check nginx logs
docker compose logs frontend

# Check CORS — VITE_API_URL must match backend
```

### File upload fails
```bash
# Check uploads directory exists
docker compose exec backend ls -la /app/uploads/

# Check file size limit
docker compose exec backend env | grep MAX_FILE_SIZE
```

### Permission denied on docker-entrypoint.sh
```bash
# Fix line endings (Windows → Unix)
dos2unix backend/docker-entrypoint.sh
# Or rebuild with explicit chmod
docker compose build --no-cache backend
```

### JWT errors
```bash
# Ensure JWT_SECRET and JWT_REFRESH_SECRET are set and at least 32 chars
# Check token expiry (JWT_EXPIRES_IN=15m default)
```

---

## 13. AWS Migration Readiness Guide

### The Provider Pattern
All integrations with external systems are abstracted behind interfaces. Migration = creating a new implementation file + changing **one line** in `backend/src/config/providers.ts`.

```typescript
// backend/src/config/providers.ts — THE ONLY FILE TO CHANGE

// Before (local):
return new LocalStorageProvider(uploadsDir, baseUrl);

// After (AWS S3):
return new S3StorageProvider(process.env.S3_BUCKET_NAME!, process.env.AWS_REGION!);
```

### Migration Steps by Service

#### PostgreSQL → Amazon RDS
1. Create RDS PostgreSQL instance in AWS
2. Update `DATABASE_URL` environment variable
3. Run `prisma migrate deploy`
4. Zero code changes

#### Local Storage → Amazon S3
1. Create `S3StorageProvider` in `backend/src/providers/implementations/`
2. Change 1 line in `config/providers.ts`
3. Zero changes to services or controllers

#### Database Notifications → Amazon SNS
1. Create `SNSNotificationProvider`
2. Change 1 line in `config/providers.ts`

#### Console Events → Amazon EventBridge
1. Create `EventBridgeProvider`
2. Change 1 line in `config/providers.ts`

#### Local Queue → Amazon SQS
1. Create `SQSQueueProvider`
2. Change 1 line in `config/providers.ts`

---

## 14. Future AWS Integration Points

| AWS Service | Replaces | Integration Point |
|---|---|---|
| **EC2** | Local dev machine | Deploy Docker containers |
| **VPC + Subnets** | Docker network | Network isolation |
| **ALB** | Nginx port 80 | Load balancer + SSL termination |
| **Auto Scaling Group** | Single container | Scale backend instances |
| **RDS** | Local PostgreSQL | `DATABASE_URL` env var |
| **S3** | `uploads/` folder | `S3StorageProvider` |
| **SNS** | DB notifications | `SNSNotificationProvider` |
| **SQS** | In-memory queue | `SQSQueueProvider` |
| **EventBridge** | Console logs | `EventBridgeProvider` |
| **Lambda** | N/A | Background job processing |
| **CloudWatch** | Console logs | Structured logging |
| **CloudTrail** | `audit_logs` table | Compliance audit trail |
| **CloudFront** | Nginx static | CDN for frontend assets |
| **Route 53** | localhost | DNS management |
| **ACM** | Self-signed | SSL/TLS certificates |
| **WAF** | express-rate-limit | DDoS + rule-based protection |
| **IAM** | `.env` secrets | Role-based AWS permissions |
| **KMS** | bcrypt | Key management |
| **SSM Parameter Store** | `.env` files | Secrets management |
| **EBS/EFS** | Docker volumes | Persistent storage |
| **Terraform** | `docker-compose.yml` | Infrastructure as Code |
