import express from 'express';
import { getHabits, createHabit, toggleHabitDate, deleteHabit, archiveHabit, updateHabit } from '../controllers/habitController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All habit routes are protected

router.get('/', getHabits);
router.post('/', createHabit);
router.patch('/:id/toggle', toggleHabitDate);
router.patch('/:id/archive', archiveHabit);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);

export default router;
