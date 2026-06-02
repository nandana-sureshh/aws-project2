import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new patient or doctor account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *       409:
 *         description: Email already registered
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using httpOnly cookie
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or missing refresh token
 */
router.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and clear refresh token cookie
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, authController.getMe);

export default router;
