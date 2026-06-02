# TESTING_GUIDE.md — CareSync

---

## Part 1: Local Machine Testing (No Docker)

### Prerequisites
```bash
node --version    # Should be 20+
npm --version     # Should be 9+
psql --version    # PostgreSQL client
```

### 1.1 Start PostgreSQL
```bash
# Option A: Docker (easiest)
docker run -d --name caresync-pg \
  -e POSTGRES_DB=caresync_db \
  -e POSTGRES_USER=caresync_user \
  -e POSTGRES_PASSWORD=caresync_pass \
  -p 5432:5432 postgres:16-alpine

# Verify:
docker exec caresync-pg pg_isready -U caresync_user
# Expected: /var/run/postgresql:5432 - accepting connections
```

### 1.2 Backend Setup
```bash
cd backend
cp .env.example .env

# Install dependencies
npm install
# Expected: added N packages

# Generate Prisma client
npx prisma generate
# Expected: Generated Prisma Client

# Run migrations
npx prisma migrate dev --name init
# Expected: Your database is now in sync with your schema.

# Seed demo data
npm run db:seed
# Expected:
# ✅ Database seeded successfully.
# 📋 Demo Credentials:
#   Admin:   admin@caresync.com     / Admin@123
#   Doctor:  dr.smith@caresync.com  / Doctor@123
#   ...

# Start server
npm run dev
# Expected:
# ✅ Database connected
# 🚀 CareSync API running at http://0.0.0.0:3000
# 📖 Swagger UI:   http://localhost:3000/api/docs
```

### 1.3 Frontend Setup
```bash
# New terminal
cd frontend
cp .env.example .env
npm install
npm run dev
# Expected:
# VITE v6.x.x  ready in Xms
# → Local: http://localhost:5173/
```

### 1.4 Verify Health Check
```bash
curl http://localhost:3000/api/health
# Expected:
# {"status":"healthy","timestamp":"2026-XX-XXTXX:XX:XX.XXXZ"}
```

### 1.5 Verify Swagger
```bash
curl http://localhost:3000/api/docs-json | head -5
# Expected: {"openapi":"3.0.0","info":{"title":"CareSync API",...
```

---

## Part 2: Docker Testing

### 2.1 Build and Start
```bash
cd monolith  # project root

# Build and start all services
docker compose up -d --build

# Expected output:
# [+] Building 45.2s (complete)
# [+] Running 3/3
#  ✔ Container caresync-postgres  Healthy
#  ✔ Container caresync-backend   Healthy
#  ✔ Container caresync-frontend  Healthy
```

### 2.2 Verify All Containers
```bash
docker compose ps
# Expected:
# NAME                  SERVICE     STATUS     PORTS
# caresync-postgres     postgres    running    0.0.0.0:5433->5432/tcp
# caresync-backend      backend     running    0.0.0.0:3000->3000/tcp
# caresync-frontend     frontend    running    0.0.0.0:80->80/tcp
```

### 2.3 Health Checks
```bash
# Backend health
curl http://localhost:3000/api/health
# Expected: {"status":"healthy","timestamp":"..."}

# Frontend accessible
curl -I http://localhost:80
# Expected: HTTP/1.1 200 OK

# Swagger accessible
curl -s http://localhost:3000/api/docs-json | python -m json.tool | head -10
```

### 2.4 Check Logs
```bash
docker compose logs backend --tail 20
# Expected: migrations applied, seed completed, server started

docker compose logs postgres --tail 10
# Expected: database system is ready to accept connections
```

### 2.5 Verify Migrations Ran
```bash
docker compose exec postgres psql -U caresync_user -d caresync_db -c "\dt"
# Expected:
#              List of relations
#  Schema |      Name       | Type  |     Owner
# --------+-----------------+-------+---------------
#  public | appointments    | table | caresync_user
#  public | audit_logs      | table | caresync_user
#  public | doctors         | table | caresync_user
#  public | documents       | table | caresync_user
#  public | medical_records | table | caresync_user
#  public | notifications   | table | caresync_user
#  public | patients        | table | caresync_user
#  public | users           | table | caresync_user
```

### 2.6 Verify Seed Data
```bash
docker compose exec postgres psql -U caresync_user -d caresync_db \
  -c "SELECT email, role FROM users ORDER BY role;"
# Expected:
#            email             |  role
# ----------------------------+---------
#  admin@caresync.com         | ADMIN
#  dr.smith@caresync.com      | DOCTOR
#  dr.johnson@caresync.com    | DOCTOR
#  patient1@caresync.com      | PATIENT
#  patient2@caresync.com      | PATIENT
```

### 2.7 Teardown
```bash
# Stop containers (preserves volumes)
docker compose down

# Stop and remove all data
docker compose down -v

# Rebuild from scratch
docker compose up -d --build
```

---

## Part 3: EC2 Deployment Testing

### 3.1 Launch EC2 Instance
```
AMI: Ubuntu 22.04 LTS
Instance Type: t3.medium (recommended) or t3.small
Storage: 20GB gp3
Security Group:
  - Port 22 (SSH) from your IP
  - Port 80 (HTTP) from 0.0.0.0/0
  - Port 443 (HTTPS) from 0.0.0.0/0
  - Port 3000 (API) from 0.0.0.0/0 (testing only, restrict in production)
```

### 3.2 Install Dependencies on EC2
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker compose version
```

### 3.3 Deploy Application
```bash
# Clone repository
git clone <your-repo-url> caresync
cd caresync

# Create environment files
cp backend/.env.example backend/.env
# Edit .env: update JWT secrets, CORS_ORIGIN to EC2 public IP or domain

# Start application
docker compose up -d --build

# Verify
docker compose ps
curl http://localhost:3000/api/health
```

### 3.4 Test from Local Machine
```bash
# Replace with your EC2 public IP
EC2_IP=<YOUR_EC2_PUBLIC_IP>

curl http://${EC2_IP}/              # Frontend
curl http://${EC2_IP}:3000/api/health  # Backend health
curl http://${EC2_IP}:3000/api/docs-json  # API spec
```

---

## Part 4: Post-Deployment Validation

### 4.1 Full Application Smoke Test
```bash
BASE_URL=http://localhost:3000  # or EC2 IP

# 1. Health check
curl -s ${BASE_URL}/api/health | python -m json.tool

# 2. Login as admin
curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@caresync.com","password":"Admin@123"}' \
  | python -m json.tool

# Save the token:
ADMIN_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@caresync.com","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# 3. Get admin stats
curl -s ${BASE_URL}/api/admin/stats \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  | python -m json.tool

# 4. Get all users
curl -s ${BASE_URL}/api/admin/users \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  | python -m json.tool
```

### 4.2 Patient Workflow Test
```bash
# Login as patient
PATIENT_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@caresync.com","password":"Patient@123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Get patient profile
curl -s ${BASE_URL}/api/patients/profile \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" | python -m json.tool

# Get available doctors
curl -s ${BASE_URL}/api/doctors \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" | python -m json.tool

# Get patient appointments
curl -s ${BASE_URL}/api/patients/appointments \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" | python -m json.tool
```

### 4.3 Doctor Workflow Test
```bash
# Login as doctor
DOCTOR_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.smith@caresync.com","password":"Doctor@123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Get doctor appointments
curl -s ${BASE_URL}/api/doctors/appointments \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" | python -m json.tool
```

### 4.4 Role Isolation Test
```bash
# Patient trying to access admin route (should get 403)
curl -s ${BASE_URL}/api/admin/stats \
  -H "Authorization: Bearer ${PATIENT_TOKEN}"
# Expected: {"error":"Forbidden","message":"Access restricted to: ADMIN","statusCode":403}

# Unauthenticated request (should get 401)
curl -s ${BASE_URL}/api/patients/profile
# Expected: {"error":"Unauthorized","message":"Access token required","statusCode":401}
```

---

## Part 5: API Testing

### 5.1 Authentication Flow
```bash
BASE_URL=http://localhost:3000

# Register new patient
curl -s -X POST ${BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newpatient@test.com",
    "password": "TestPass@123",
    "firstName": "Test",
    "lastName": "Patient",
    "role": "PATIENT"
  }' | python -m json.tool
# Expected: 201 with accessToken and user object

# Login
curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newpatient@test.com","password":"TestPass@123"}' \
  | python -m json.tool
# Expected: 200 with accessToken and user

# Invalid login
curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrongpass"}' \
  | python -m json.tool
# Expected: 401 Unauthorized
```

### 5.2 Appointment Workflow
```bash
# Get doctor list to find a doctorId
DOCTOR_ID=$(curl -s ${BASE_URL}/api/doctors \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  | python -c "import sys,json; data=json.load(sys.stdin); print(data['data'][0]['id'])")

echo "Doctor ID: ${DOCTOR_ID}"

# Book appointment (30 minutes in future)
FUTURE_DATE=$(date -u -d "+30 minutes" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || \
  python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow()+timedelta(minutes=30)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))")

curl -s -X POST ${BASE_URL}/api/appointments \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"doctorId\": \"${DOCTOR_ID}\",
    \"scheduledAt\": \"${FUTURE_DATE}\",
    \"reason\": \"Annual checkup\"
  }" | python -m json.tool
# Expected: 201 with appointment object
```

### 5.3 File Upload Test
```bash
# Create a test file
echo "Test medical document content" > /tmp/test.txt

# Upload
curl -s -X POST ${BASE_URL}/api/documents \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -F "file=@/tmp/test.txt" \
  | python -m json.tool
# Expected: 201 with document object

# Get uploaded documents
curl -s ${BASE_URL}/api/documents \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  | python -m json.tool

# Download (save DOC_ID from previous response)
# curl -s ${BASE_URL}/api/documents/${DOC_ID}/download \
#   -H "Authorization: Bearer ${PATIENT_TOKEN}" \
#   -o /tmp/downloaded.txt
```

### 5.4 Notification Test
```bash
# Get unread count
curl -s ${BASE_URL}/api/notifications/unread-count \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  | python -m json.tool
# Expected: {"data":{"count":N}}

# Get notifications
curl -s "${BASE_URL}/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  | python -m json.tool

# Mark all read
curl -s -X PATCH ${BASE_URL}/api/notifications/mark-all-read \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  | python -m json.tool
```

---

## Part 6: Database Testing

### 6.1 Connect to Database
```bash
# Docker
docker compose exec postgres psql -U caresync_user -d caresync_db

# Local
psql postgresql://caresync_user:caresync_pass@localhost:5432/caresync_db
```

### 6.2 Verify Schema
```sql
-- List all tables
\dt

-- Describe users table
\d users

-- Describe appointments table
\d appointments
```

### 6.3 Data Integrity Checks
```sql
-- All users with their roles
SELECT email, role, "isActive", "createdAt"
FROM users
ORDER BY role, "createdAt";

-- Patient-user join check
SELECT u.email, u.role, p.id AS patient_id, p."bloodGroup"
FROM users u
JOIN patients p ON u.id = p."userId";

-- Doctor-user join check
SELECT u.email, d.specialization, d."licenseNumber"
FROM users u
JOIN doctors d ON u.id = d."userId";

-- Appointment count per status
SELECT status, COUNT(*) as count
FROM appointments
GROUP BY status;

-- Notifications per user
SELECT u.email, COUNT(n.id) as notification_count, 
       COUNT(CASE WHEN NOT n."isRead" THEN 1 END) as unread_count
FROM users u
LEFT JOIN notifications n ON u.id = n."userId"
GROUP BY u.email;

-- Audit log entries
SELECT action, resource, "createdAt"
FROM audit_logs
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 6.4 Referential Integrity Test
```sql
-- Try to delete a user with appointments (should fail due to FK)
-- This demonstrates Prisma's referential integrity enforcement

-- Count orphaned records (should all be 0)
SELECT COUNT(*) AS orphaned_patients
FROM patients p
LEFT JOIN users u ON p."userId" = u.id
WHERE u.id IS NULL;

SELECT COUNT(*) AS orphaned_appointments
FROM appointments a
LEFT JOIN patients p ON a."patientId" = p.id
WHERE p.id IS NULL;
```

### 6.5 Performance Check
```sql
-- Verify indexes exist on foreign keys
\d appointments
-- Expected: indexes on patientId, doctorId

-- Explain a common query
EXPLAIN ANALYZE
SELECT * FROM appointments
WHERE "patientId" = (SELECT id FROM patients LIMIT 1)
ORDER BY "scheduledAt" DESC;
```

### 6.6 Prisma Studio (GUI)
```bash
# Visual database explorer
cd backend
npx prisma studio
# Opens http://localhost:5555
```
