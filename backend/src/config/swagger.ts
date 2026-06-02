import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CareSync API',
      version: '1.0.0',
      description:
        'CareSync — Cloud-Native Hospital Appointment & Records System API. ' +
        'Built for AWS migration readiness with provider pattern abstractions.',
      contact: {
        name: 'CareSync Team',
        email: 'admin@caresync.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? 3000}`,
        description: 'Development Server',
      },
      {
        url: 'https://api.caresync.com',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'DOCTOR', 'PATIENT'] },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@caresync.com' },
            password: { type: 'string', minLength: 8, example: 'Admin@123' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['DOCTOR', 'PATIENT'] },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            scheduledAt: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
            },
            reason: { type: 'string' },
            notes: { type: 'string', nullable: true },
            duration: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        MedicalRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            appointmentId: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            diagnosis: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            treatment: { type: 'string', nullable: true },
            prescription: { type: 'string', nullable: true },
            followUpDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            filename: { type: 'string' },
            originalName: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'number' },
            url: { type: 'string' },
            uploadedAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Patients', description: 'Patient management' },
      { name: 'Doctors', description: 'Doctor management' },
      { name: 'Appointments', description: 'Appointment management' },
      { name: 'Medical Records', description: 'Medical records and notes' },
      { name: 'Documents', description: 'File upload and download' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Admin', description: 'Admin operations' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
