/**
 * MongoDB Connection Test Script
 * 
 * Run this script to verify MongoDB Atlas connection:
 * node src/utils/testMongoConnection.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ ERROR: No MONGO_URI defined in .env file');
  process.exit(1);
}

console.log(`🔄 Testing connection to MongoDB Atlas...`);
console.log(`🔗 Connection string: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//******:******@')}`);

// MongoDB Atlas connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

// Connect to MongoDB
mongoose.connect(MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('✅ SUCCESS: MongoDB Atlas connection established!');
    
    // Test database operation - create and read a test document
    const TestModel = mongoose.model('TestConnection', new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    return TestModel.create({ message: 'Connection test successful' })
      .then(doc => {
        console.log(`📝 Test document created with ID: ${doc._id}`);
        return mongoose.connection.close();
      });
  })
  .then(() => {
    console.log('🔒 Connection closed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ ERROR: MongoDB connection failed', err);
    process.exit(1);
  }); 