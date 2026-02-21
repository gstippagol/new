import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        resetPasswordOTP: String,
        resetPasswordExpires: Date,
        lastReminderSent: Date
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
