# Application-Level Design Review: CareSync Backend

This design review was conducted prior to executing Phase 2 (SNS) and Phase 3 (EventBridge + Lambda). It analyzes the existing backend application architecture to determine the optimal integration strategy and verify the proposed serverless design against the actual monolithic codebase.

## Files Analyzed
* `backend/prisma/schema.prisma`
* `backend/src/config/providers.ts`
* `backend/src/providers/interfaces/NotificationProvider.ts`
* `backend/src/providers/implementations/DatabaseNotificationProvider.ts`
* `backend/src/services/appointment.service.ts`
* `backend/src/services/auth.service.ts`
* `backend/src/controllers/notification.controller.ts`
* `backend/package.json`

---

## 1. How notifications are currently created, stored, and consumed
* **Creation**: Application services (e.g., `appointment.service.ts`) instantiate notifications via `NotificationProvider.sendBulk()`. For example, when an appointment is created, the service pushes `APPOINTMENT_CREATED` payloads to the provider.
* **Storage**: The `DatabaseNotificationProvider` translates these payloads into Prisma `createMany` calls, saving them directly to the `notifications` Postgres table.
* **Consumption**: The frontend retrieves these via the `/api/notifications` routes, which invoke `DatabaseNotificationProvider.getAll()` and `getUnread()`.
* **Conclusion**: Currently, all notifications are strictly **in-app** notifications stored persistently in the database.

## 2. Is `DatabaseNotificationProvider.ts` the canonical implementation?
* **Yes.** Inspection of `src/config/providers.ts` confirms that `DatabaseNotificationProvider` is the only active notification provider injected into the application controllers.
* While the codebase hints at future expansions (`// Future: return new SNSNotificationProvider()`), the application relies entirely on the database implementation today.

## 3. Reusing existing services vs. Lambda SQL logic
The application currently handles user-driven REST API requests. It does **not** contain a background job runner (like BullMQ or Agenda) or cron-trigger endpoints.
* To reuse `appointment.service.ts`, we would need to modify the Express backend to expose a secured `/api/admin/reminders/trigger` endpoint, which EventBridge would invoke via HTTP.
* **Design Decision**: The proposed Lambda architecture (EventBridge → Lambda → RDS) is significantly cleaner. It avoids polluting the REST API surface with cron endpoints, bypasses complex authentication requirements for machine-to-machine HTTP calls, and keeps scheduled infrastructure tasks decoupled from the monolithic application layer.

## 4. Reusing existing email architecture vs. SNS
* A thorough `grep` of the entire backend codebase confirms that **there is currently no email architecture**. The application lacks Nodemailer, SendGrid, SES, or any HTML email templates. Even the `auth.service.ts` lacks welcome email functionality.
* **Design Decision**: Because the monolith lacks email capabilities, pushing the email delivery requirement to SNS via the Lambda function is the most efficient and least intrusive approach. It introduces email alerts without forcing the monolith to adopt new heavy dependencies.

## 5. Do the Lambda SQL queries match the Prisma schema?
* **Case Sensitivity Verification**: Prisma fields like `scheduledAt` and `firstName` do not use `@map` decorators in `schema.prisma`. Therefore, Postgres creates these columns with exact case sensitivity.
* The proposed Lambda uses raw SQL quoting to match this perfectly: `a."scheduledAt"`, `pu."firstName"`.
* **Cleanup Logic Verification**: The `Notification` model contains an `id`, `userId`, `type`, `title`, `message`, `isRead`, `metadata`, and `createdAt` field. It **lacks** an `updatedAt` field. The proposed Lambda cleanup query (`DELETE FROM notifications WHERE "createdAt" < $1`) perfectly aligns with the actual table schema.

## 6. Which existing application files must change?
* **Zero.** The Phase 3 architecture is 100% infrastructure-driven. The backend source code does not need a single modification to support the reminders or cleanup jobs.
* The Reminder Lambda creates deduplication records by writing directly to the `notifications` table (with `type: 'SYSTEM'`). Because it mimics the exact data structure created by `DatabaseNotificationProvider`, these reminders will appear natively in the user's frontend notification bell automatically.

## 7. Lambda implementation vs. Invoking Application Services
* Reusing application services inside a Lambda would require packaging the entire compiled Express backend into the Lambda zip file (or using an expensive Docker image Lambda).
* The proposed standalone Node.js 20 Lambda using raw `pg` (node-postgres) is extremely lightweight, requires zero transpilation, and executes in milliseconds, reducing AWS costs compared to bootstrapping the entire monolithic application inside a serverless function.

---

> [!NOTE]
> Based on this review, the serverless architecture originally proposed (direct RDS queries from Lambda + SNS for email) is perfectly aligned with the constraints and current state of the backend codebase. It avoids monolithic bloat, respects the Prisma schema exactly, and requires zero modifications to the application source code.
