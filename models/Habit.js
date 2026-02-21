import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
    title: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedDates: { type: [String], default: [] }, // Store dates as YYYY-MM-DD strings
    streak: { type: Number, default: 0 },
    target: { type: Number, default: 10 },
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

const Habit = mongoose.model('Habit', habitSchema);
export default Habit;
