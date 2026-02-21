import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['login', 'logout', 'habit_create', 'habit_toggle', 'habit_archive', 'session_duration'],
        required: true
    },
    details: {
        type: String,
        default: ''
    },
    loginTime: Date,
    logoutTime: Date,
    durationMinutes: Number,
    metadata: {
        browser: String,
        os: String,
        ip: String
    }
}, { timestamps: true });

export default mongoose.model("ActivityLog", activityLogSchema);
