import Habit from '../models/Habit.js';
import ActivityLog from '../models/ActivityLog.js';

export const getHabits = async (req, res) => {
    try {
        // Return all habits, frontend handles filtering by isArchived
        const habits = await Habit.find({ user: req.user._id });
        res.json(habits);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createHabit = async (req, res) => {
    const { title, target } = req.body;
    try {
        const newHabit = new Habit({
            title,
            target,
            user: req.user._id
        });
        await newHabit.save();

        // Record Activity
        await ActivityLog.create({
            user: req.user._id,
            type: 'habit_create',
            details: `Created new habit: ${title}`
        });

        res.status(201).json(newHabit);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const toggleHabitDate = async (req, res) => {
    const { id } = req.params;
    const { date } = req.body; // YYYY-MM-DD
    try {
        const habit = await Habit.findOne({ _id: id, user: req.user._id });
        if (!habit) return res.status(404).json({ message: 'Habit not found' });

        const dateIndex = habit.completedDates.indexOf(date);
        let action = '';
        if (dateIndex > -1) {
            habit.completedDates.splice(dateIndex, 1);
            action = 'unmarked';
        } else {
            habit.completedDates.push(date);
            action = 'marked';
        }

        habit.streak = habit.completedDates.length;
        await habit.save();

        // Record Activity
        await ActivityLog.create({
            user: req.user._id,
            type: 'habit_toggle',
            details: `User ${action} ${habit.title} for ${date}`
        });

        res.json(habit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteHabit = async (req, res) => {
    try {
        const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!habit) return res.status(404).json({ message: 'Habit not found' });
        res.json({ message: 'Habit deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const archiveHabit = async (req, res) => {
    const { isArchived } = req.body;
    try {
        const habit = await Habit.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isArchived: isArchived !== undefined ? isArchived : true },
            { new: true }
        );
        if (!habit) return res.status(404).json({ message: 'Habit not found' });

        // Record Activity
        await ActivityLog.create({
            user: req.user._id,
            type: 'habit_archive',
            details: `${isArchived ? 'Archived' : 'Restored'} habit: ${habit.title}`
        });

        res.json(habit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const updateHabit = async (req, res) => {
    const { title, target } = req.body;
    try {
        const habit = await Habit.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { title, target },
            { new: true }
        );
        if (!habit) return res.status(404).json({ message: 'Habit not found' });
        res.json(habit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
