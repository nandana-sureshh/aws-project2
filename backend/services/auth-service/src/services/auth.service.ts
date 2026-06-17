import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import {
  prisma,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  AppError,
  loginSchema,
  registerSchema,
  createAuditLog,
} from '@caresync/shared';

const SALT_ROUNDS = 12;

export async function login(body: unknown, ipAddress?: string) {
  const { email, password } = loginSchema.parse(body);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401, 'Unauthorized');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401, 'Unauthorized');
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    resource: 'auth',
    ipAddress,
    details: { email },
  });

  const { password: _, ...userWithoutPassword } = user;
  return { accessToken, refreshToken, user: userWithoutPassword };
}

export async function register(body: unknown, ipAddress?: string) {
  const data = registerSchema.parse(body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email already registered', 409, 'Conflict');
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      role: data.role as Role,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });

  if (data.role === 'PATIENT') {
    await prisma.patient.create({ data: { userId: user.id } });
  }

  if (data.role === 'DOCTOR') {
    await prisma.doctor.create({
      data: {
        userId: user.id,
        specialization: 'General Medicine',
        licenseNumber: `PENDING-${user.id.slice(0, 8).toUpperCase()}`,
        isAvailable: true,
      },
    });
  }

  await createAuditLog({
    userId: user.id,
    action: 'REGISTER',
    resource: 'auth',
    ipAddress,
    details: { email: data.email, role: data.role },
  });

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const { password: _, ...userWithoutPassword } = user;
  return { accessToken, refreshToken, user: userWithoutPassword };
}

export async function refreshTokens(token: string) {
  const payload = verifyRefreshToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user || !user.isActive) {
    throw new AppError('Invalid refresh token', 401, 'Unauthorized');
  }

  const newPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const refreshToken = signRefreshToken(newPayload);

  return { accessToken, refreshToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
      patient: true,
      doctor: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'Not Found');
  }

  return user;
}
