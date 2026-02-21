import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import { initReminderCron } from "./utils/reminderCron.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && Object.keys(req.body).length > 0) {
        // Log a sanitized version of the body (hide passwords)
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '********';
        console.log(`   Body:`, JSON.stringify(sanitizedBody, null, 2));
    }
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);

// Root & Health Check
app.get("/", (req, res) => res.send("🚀 Habit Tracker API is running..."));
app.get("/api", (req, res) => res.json({ message: "Welcome to Habit Tracker API", version: "1.0.0" }));

// 404 Handler - MUST be after all routes
app.use((req, res) => {
    console.warn(`404 - ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: "Not Found",
        message: `The requested path ${req.originalUrl} does not exist on this server.`,
        suggestedRoutes: ["/api/auth/login", "/api/habits"]
    });
});

const PORT = process.env.PORT || 5000;

// Connect to DB then start server
connectDB().then(() => {
    initReminderCron();
    app.listen(PORT, () => {
        console.log(`🚀 Backend running on port ${PORT}`);
    });
});