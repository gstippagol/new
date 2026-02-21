import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendMail } from '../utils/mailer.js';

// ... (rest of imports and generateToken)

export const logout = async (req, res) => {
    const { durationMinutes } = req.body;
    try {
        await ActivityLog.create({
            user: req.user._id,
            type: 'logout',
            details: `User logged out after ${durationMinutes || 0} minutes`,
            durationMinutes: durationMinutes || 0,
            logoutTime: new Date()
        });
        res.json({ message: 'Logout recorded' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserIntelligence = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const habits = await Habit.find({ user: id });
        const logs = await ActivityLog.find({ user: id }).sort({ createdAt: -1 }).limit(100);

        // --- Calculate Behavioral Intelligence ---
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

        let markedToday = false;
        let totalMonthlyPossible = 0;
        let totalMonthlyDone = 0;
        let lastMarkDateStr = null;

        habits.forEach(h => {
            // Check if marked today
            if (h.completedDates.includes(todayStr)) markedToday = true;

            // Monthly stats
            const currentMonthMarks = h.completedDates.filter(d => d.startsWith(currentMonthPrefix)).length;
            totalMonthlyDone += currentMonthMarks;

            // Simplified: Assume 30 days in month for performance ratio if not tracking specifically
            totalMonthlyPossible += 30;

            // Track most recent mark across all habits
            h.completedDates.forEach(d => {
                if (!lastMarkDateStr || d > lastMarkDateStr) lastMarkDateStr = d;
            });
        });

        const monthlyPerformance = totalMonthlyPossible > 0 ? Math.round((totalMonthlyDone / totalMonthlyPossible) * 100) : 0;

        let daysSinceLastMark = null;
        if (lastMarkDateStr) {
            const diff = new Date() - new Date(lastMarkDateStr);
            daysSinceLastMark = Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        // Calculate total time spent from session and logout logs
        const totalMinutes = await ActivityLog.aggregate([
            { $match: { user: user._id, type: { $in: ['logout', 'session_duration'] } } },
            { $group: { _id: null, total: { $sum: "$durationMinutes" } } }
        ]);

        res.json({
            user,
            habits,
            logs,
            totalTimeSpent: totalMinutes[0]?.total || 0,
            intelligence: {
                markedToday,
                monthlyPerformance,
                daysSinceLastMark,
                lastEmailSent: user.lastReminderSent
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const recordSession = async (req, res) => {
    const { durationMinutes } = req.body;
    try {
        await ActivityLog.create({
            user: req.user._id,
            type: 'session_duration',
            details: `Captured session pulse: ${durationMinutes} minutes`,
            durationMinutes
        });
        res.json({ message: 'Pulse captured' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const sendCredentialsEmail = async (email, username, password) => {
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #00ccff;">Welcome to Habit Tracker!</h2>
            <p>An administrator has created an account for you.</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Password:</strong> ${password}</p>
            </div>
            <p>You can now log in at <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">Habit Tracker Login</a></p>
            <p style="color: #888; font-size: 12px; margin-top: 30px;">Please change your password after your first login.</p>
        </div>
    `;

    await sendMail({
        to: email,
        subject: 'Your Habit Tracker Credentials',
        html: emailHtml
    });
};

export const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ username, email, password: hashedPassword });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const adminCreateUser = async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        // Send email (async, don't wait for it to block response)
        sendCredentialsEmail(email, username, password);

        res.status(201).json({
            message: 'User created successfully and email notification triggered',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password, deviceInfo } = req.body;
    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Check if account is active
            if (user.isActive === false) {
                return res.status(403).json({ message: 'Account Deactivated: Access is restricted by administrator.' });
            }

            // Record Login Activity with Device Intelligence
            await ActivityLog.create({
                user: user._id,
                type: 'login',
                details: `User logged in from ${deviceInfo?.os || 'Unknown Device'}`,
                loginTime: new Date(),
                metadata: {
                    browser: deviceInfo?.browser,
                    os: deviceInfo?.os,
                    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
                }
            });

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const sendOTPEmail = async (email, otp) => {
    const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Use the following OTP to reset your password. This code is valid for 10 minutes.</p>
            <div style="font-size: 24px; font-weight: bold; color: #00ccff; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
            </div>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    `;

    await sendMail({
        to: email,
        subject: 'Password Reset OTP',
        html: emailHtml
    });
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save();

        await sendOTPEmail(email, otp);
        res.json({ message: 'OTP sent to your email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

        user.password = await bcrypt.hash(newPassword, 12);
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password, isActive } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (password) {
            user.password = await bcrypt.hash(password, 12);
        }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            isActive: updatedUser.isActive
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Restricted Action: Administrative accounts cannot be purged.' });
        }

        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
