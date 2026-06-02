# PROJECT_DOCUMENTATION.md — CareSync

## 1. Functional Requirements

### Authentication Module
- Users can register as Patient or Doctor
- Admin accounts are created directly in the database (seeded)
- Login returns JWT access token (15min) + httpOnly refresh cookie (7d)
- Role-based access control enforced at every API endpoint
- Passwords hashed with bcrypt (12 rounds)

### Patient Module
- Patients can view and update their profile (gender, phone, address, blood group)
- Patients can view their appointments (paginated)
- Patients can book appointments with any available doctor
- Patients can cancel SCHEDULED appointments
- Patients can upload and download documents
- Patients can view their medical records

### Doctor Module
- Doctors can view and update their profile (specialization, bio, availability)
- Doctors can view all their appointments (filterable by status)
- Doctors can confirm/complete/cancel appointments
- Doctors can create medical records for completed appointments
- Doctors can view all patients

### Appointment Module
- Patient books appointment (selects doctor, datetime, reason)
- Time slot conflict detection prevents double-booking
- Status transitions: SCHEDULED → CONFIRMED → COMPLETED/CANCELLED/NO_SHOW
- Notifications sent to both patient and doctor on status change
- Events published to EventProvider on all status changes

### Medical Records Module
- One record per appointment (enforced by database unique constraint)
- Fields: diagnosis, notes, treatment, prescription, followUpDate
- Only the assigned doctor can create/update records
- Patients can view all their own records

### Document Module
- File upload through StorageProvider (never touches fs directly in business logic)
- Allowed types: PDF, images (JPEG, PNG, GIF, WebP), Word documents, plain text
- Max file size configurable via `MAX_FILE_SIZE_MB` env var
- Files can be linked to appointments or medical records
- Download served as binary with correct Content-Type and Content-Disposition

### Notification Module
- All notifications stored via NotificationProvider
- Types: APPOINTMENT_CREATED, APPOINTMENT_CONFIRMED, APPOINTMENT_CANCELLED,
  APPOINTMENT_COMPLETED, DOCUMENT_UPLOADED, RECORD_ADDED, SYSTEM
- Unread count polling every 30 seconds in frontend
- Mark individual or all notifications as read

### Admin Module
- View system-wide statistics (users, patients, doctors, appointments)
- View all users with role filter
- Activate/deactivate user accounts (cannot deactivate admins)
- Create doctor accounts directly (with license number validation)
- View complete paginated audit log

---

## 2. Non-Functional Requirements

| Requirement | Implementation |
|---|---|
| **Performance** | Pagination on all list endpoints, indexed foreign keys via Prisma |
| **Security** | Helmet.js, CORS, JWT RBAC, bcrypt, rate limiting, Zod validation |
| **Scalability** | Provider pattern enables horizontal scaling of individual services |
| **Maintainability** | Service layer separation, no business logic in controllers |
| **Portability** | Docker Compose for local, environment-variable driven configuration |
| **Auditability** | All mutations logged to audit_logs table with user, action, resource |
| **AWS Readiness** | Provider abstraction isolates all external system dependencies |

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                          │
│  Pages: Login, Register, Patient, Doctor, Admin                    │
│  AuthContext → JWT stored in localStorage                          │
│  Axios interceptors → auto-refresh on 401                         │
└───────────────────────────┬────────────────────────────────────────┘
                            │ HTTP (REST/JSON)
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Express)                         │
│                                                                    │
│  Middleware Stack:                                                  │
│  Helmet → CORS → Compression → Morgan → Rate Limit                │
│                                                                    │
│  Route Layer → Controller Layer → Service Layer                    │
│                                                                    │
│  Service Layer uses ONLY provider interfaces:                      │
│  ┌──────────────┬────────────────┬──────────────┬───────────────┐ │
│  │StorageProvider│NotificationProv│ EventProvider│ QueueProvider │ │
│  └──────┬───────┴────────┬───────┴──────┬───────┴───────┬───────┘ │
│         │                │              │               │          │
│  LocalStorage    DatabaseNotif    ConsoleEvent   LocalQueue        │
│  [S3 ready]    [SNS ready]     [EB ready]     [SQS ready]         │
└────────────────────────────┬───────────────────────────────────────┘
                             │ Prisma Client
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                           │
│  8 tables: users, patients, doctors, appointments,                │
│  medical_records, documents, notifications, audit_logs             │
└────────────────────────────────────────────────────────────────────┘
```

### Provider Pattern Detail

```
Business Service (appointment.service.ts)
        │
        │ calls storageProvider.uploadFile()
        │       — NOT fs.writeFile()
        │
        ▼
StorageProvider interface
        │
        ├── LocalStorageProvider (current)
        │       uses: fs module, local disk
        │
        └── S3StorageProvider (future AWS)
                uses: @aws-sdk/client-s3
                requires: zero changes to appointment.service.ts
```

---

## 4. Database Design

### Entity-Relationship Summary

```
users (1) ──── (0..1) patients
users (1) ──── (0..1) doctors
users (1) ──── (N) notifications
users (1) ──── (N) documents
users (1) ──── (N) audit_logs

patients (1) ──── (N) appointments
doctors  (1) ──── (N) appointments

appointments (1) ──── (0..1) medical_records
appointments (1) ──── (N) documents

medical_records (1) ──── (N) documents
```

### Table Definitions

**users**
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default uuid() |
| email | String | UNIQUE |
| password | String | bcrypt hashed |
| role | Enum(ADMIN,DOCTOR,PATIENT) | NOT NULL |
| firstName | String | NOT NULL |
| lastName | String | NOT NULL |
| isActive | Boolean | DEFAULT true |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | @updatedAt |

**appointments**
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| patientId | UUID | FK → patients.id |
| doctorId | UUID | FK → doctors.id |
| scheduledAt | DateTime | NOT NULL |
| status | Enum | DEFAULT SCHEDULED |
| reason | String | NOT NULL |
| notes | String | NULLABLE |
| duration | Int | DEFAULT 30 (minutes) |

---

## 5. API Design

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

### Endpoints Summary

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login |
| POST | `/auth/register` | Public | Register |
| POST | `/auth/refresh` | Public | Refresh tokens |
| POST | `/auth/logout` | Any | Logout |
| GET | `/auth/me` | Any | Get current user |
| GET | `/patients/profile` | PATIENT | Get profile |
| PUT | `/patients/profile` | PATIENT | Update profile |
| GET | `/patients/appointments` | PATIENT | My appointments |
| GET | `/patients` | ADMIN/DOCTOR | List patients |
| GET | `/doctors` | Any | List doctors |
| GET | `/doctors/profile` | DOCTOR | Get profile |
| PUT | `/doctors/profile` | DOCTOR | Update profile |
| GET | `/doctors/appointments` | DOCTOR | My appointments |
| POST | `/appointments` | PATIENT | Book appointment |
| GET | `/appointments/:id` | Any | Get appointment |
| PATCH | `/appointments/:id` | Any | Update status |
| GET | `/appointments` | ADMIN | All appointments |
| POST | `/records` | DOCTOR | Create record |
| GET | `/records/my` | PATIENT | My records |
| GET | `/records/:id` | Any | Get record |
| PATCH | `/records/:id` | DOCTOR | Update record |
| POST | `/documents` | Any | Upload file |
| GET | `/documents` | Any | My documents |
| GET | `/documents/:id/download` | Any | Download file |
| DELETE | `/documents/:id` | Any | Delete file |
| GET | `/notifications` | Any | My notifications |
| GET | `/notifications/unread-count` | Any | Unread count |
| PATCH | `/notifications/:id/read` | Any | Mark read |
| PATCH | `/notifications/mark-all-read` | Any | Mark all read |
| GET | `/admin/stats` | ADMIN | Dashboard stats |
| GET | `/admin/users` | ADMIN | All users |
| PATCH | `/admin/users/:id/toggle-status` | ADMIN | Toggle active |
| POST | `/admin/doctors` | ADMIN | Create doctor |
| GET | `/admin/audit-logs` | ADMIN | Audit logs |
| GET | `/health` | Public | Health check |

### Error Response Format
```json
{
  "error": "Not Found",
  "message": "Appointment not found",
  "statusCode": 404
}
```

### Pagination Response Format
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## 6. Deployment Architecture

### Current (Docker Compose)
```
Host Machine
├── caresync-postgres (PostgreSQL 16)
├── caresync-backend  (Node.js 20, port 3000)
└── caresync-frontend (Nginx, port 80)
```

### Target (AWS)
```
Internet
    │
    ▼
Route 53 (DNS)
    │
    ▼
CloudFront (CDN — React SPA static assets)
    │
    ▼
WAF (Web Application Firewall)
    │
    ▼
ALB (Application Load Balancer — SSL Termination via ACM)
    │
    ├─── EC2 Auto Scaling Group (Backend API)
    │         └── ECS/EC2 → Docker containers
    │
    └─── RDS PostgreSQL (Multi-AZ)
              └── EFS/S3 (file storage)

Supporting Services:
    SNS → Notifications
    SQS → Job queuing
    EventBridge → Event routing
    Lambda → Background processors
    CloudWatch → Logs + Metrics
    CloudTrail → Audit trail
    SSM Parameter Store → Secrets
    KMS → Encryption at rest
```

---

## 7. AWS Integration Strategy

### Phase 1: Lift & Shift (EC2 + VPC)
- Deploy Docker Compose on EC2 in a VPC
- Configure Security Groups to restrict inbound traffic
- Use public subnet for ALB, private subnets for backend + database
- Route 53 for DNS

### Phase 2: Managed Database (RDS)
- Replace PostgreSQL container with RDS PostgreSQL
- Update `DATABASE_URL` only — zero code changes
- Enable Multi-AZ for high availability
- Enable automated backups

### Phase 3: File Storage (S3)
- Create `S3StorageProvider` implementation
- Update `config/providers.ts` to use S3
- Zero changes to document.service.ts or controllers
- Enable S3 versioning and server-side encryption

### Phase 4: Messaging (SNS + SQS + EventBridge)
- Create `SNSNotificationProvider`
- Create `SQSQueueProvider`
- Create `EventBridgeProvider`
- Update `config/providers.ts` — zero code changes elsewhere

### Phase 5: Scale & CDN (ALB + ASG + CloudFront)
- Put ALB in front of backend instances
- Configure Auto Scaling Group based on CPU/request metrics
- Serve frontend via CloudFront for global low-latency

### Phase 6: Security (WAF + KMS + SSM)
- Add WAF rules to ALB
- Move secrets from env vars to SSM Parameter Store
- Enable KMS encryption for RDS and S3

### Phase 7: Observability (CloudWatch + CloudTrail)
- Configure CloudWatch log groups for backend
- Set up CloudWatch alarms for error rates
- Enable CloudTrail for AWS-level audit trail

### Phase 8: IaC (Terraform)
- Replace `docker-compose.yml` with Terraform modules
- VPC, Subnets, Route Tables, Security Groups, ALB, ASG, RDS, S3, CloudFront

---

## 8. Security Considerations

### Authentication & Authorization
- JWT tokens with short expiry (15 minutes)
- Refresh tokens stored in httpOnly cookies (XSS resistant)
- bcrypt with 12 rounds for password hashing
- Role-based access control on every endpoint

### Input Validation
- All request bodies validated with Zod schemas
- File MIME type validation before storage
- SQL injection prevention via Prisma parameterized queries

### Network Security
- Helmet.js sets secure HTTP headers
- CORS restricted to configured origins
- Rate limiting (100 req/15min per IP)
- Express trust proxy configured for ALB compatibility

### Audit Trail
- Every create/update/delete/upload logged to `audit_logs`
- IP addresses captured on login events
- Immutable audit records (no update/delete on audit_logs)

### File Security
- Files stored with UUID names (no predictable paths)
- MIME type validation on upload
- File size limits enforced
- Downloads routed through authenticated endpoints
