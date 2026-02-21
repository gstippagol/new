import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            console.log('Admin user already exists:', adminExists.email);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123', 12);

        const adminUser = new User({
            username: 'admin',
            email: 'admin@habit.com',
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Super user admin created successfully!');
        console.log('Email: admin@habit.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
