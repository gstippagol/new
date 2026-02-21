import cron from 'node-cron';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import { sendMail } from './mailer.js';

export const initReminderCron = () => {
    // Run every day at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log('--- 🛡️ Running Inactivity Scan ---');
        try {
            const users = await User.find({ isActive: true });
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const user of users) {
                // Find all habits for this user
                const habits = await Habit.find({ user: user._id, isArchived: false });
                if (habits.length === 0) continue;

                // Check if user has already received a reminder in the last 2 days to avoid spam
                if (user.lastReminderSent) {
                    const lastReminderDate = new Date(user.lastReminderSent);
                    const diffTime = Math.abs(today - lastReminderDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 3) continue; // Only remind every 3 days if they stay inactive
                }

                let isInactive = true;
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                twoDaysAgo.setHours(0, 0, 0, 0);

                // A user is "Active" if ANY of their habits has a mark in the last 2 days
                for (const habit of habits) {
                    const recentMarks = (habit.completedDates || []).filter(dateStr => {
                        const markDate = new Date(dateStr);
                        return markDate >= twoDaysAgo;
                    });

                    if (recentMarks.length > 0) {
                        isInactive = false;
                        break;
                    }
                }

                if (isInactive) {
                    console.log(`📡 Sending nudge to: ${user.username} (${user.email})`);

                    const emailHtml = `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: #fafafa;">
                            <h2 style="color: #00ccff; text-align: center;">Don't break the chain! ⛓️</h2>
                            <p style="font-size: 1.1rem; color: #333;">Hi <strong>${user.username}</strong>,</p>
                            <p style="line-height: 1.6; color: #555;">
                                We noticed your dashboard has been a bit quiet for the past <strong>2 days</strong>. 
                            </p>
                            <div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #00ccff; margin: 20px 0;">
                                <p style="margin: 0; font-style: italic; color: #666;">
                                    "Consistency is the only bridge between your goals and your reality. Every day you skip is a day you move further away from the person you want to become."
                                </p>
                            </div>
                            <p style="font-weight: bold; color: #333;">Why jump back in?</p>
                            <ul style="color: #555;">
                                <li>🔥 Protect your current streaks.</li>
                                <li>📈 Keep your visual analytics growing.</li>
                                <li>💪 Strengthen your self-discipline.</li>
                            </ul>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                                   style="background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%); color: #000; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: 900; box-shadow: 0 10px 20px rgba(0, 204, 255, 0.2);">
                                   🚀 GO TO MY DASHBOARD
                                </a>
                            </div>
                            <p style="color: #888; font-size: 0.8rem; margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                                Discipline over motivation. <br>
                                <strong>The Habit Tracker Team</strong>
                            </p>
                        </div>
                    `;

                    await sendMail({
                        to: user.email,
                        subject: "Your habits are waiting... ⛓️",
                        html: emailHtml
                    });

                    // Update last reminder sent date
                    user.lastReminderSent = new Date();
                    await user.save();
                }
            }
        } catch (error) {
            console.error('❌ Inactivity Job Error:', error);
        }
    });

    console.log('✅ Cron Job Initialized: Daily Inactivity Scan @ 10:00 AM');
};
