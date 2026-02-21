import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error("The server will start, but database features will be unavailable.");
    console.error("Please start MongoDB locally or update MONGO_URI in .env");
  }
};

export default connectDB;