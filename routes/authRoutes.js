import express from 'express';
import { login, register, adminCreateUser, forgotPassword, resetPassword, getAllUsers, updateUser, deleteUser, logout, recordSession, getUserIntelligence } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/session-pulse', protect, recordSession);

// Admin only routes
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.get('/admin/user-intelligence/:id', protect, adminOnly, getUserIntelligence);
router.post('/admin/create-user', protect, adminOnly, adminCreateUser);
router.put('/admin/users/:id', protect, adminOnly, updateUser);
router.delete('/admin/users/:id', protect, adminOnly, deleteUser);

export default router;
