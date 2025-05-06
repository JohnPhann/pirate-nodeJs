/**
 * Database seeding utility
 * 
 * This script will populate the database with sample data for development and testing.
 * CAUTION: This will clear existing collections!
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Room, Message } = require('../models');
const config = require('../config');
const logger = require('./logger');

// Sample user data
const users = [
  {
    username: 'john',
    email: 'john@example.com',
    password: 'password123'
  },
  {
    username: 'jane',
    email: 'jane@example.com',
    password: 'password123'
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    password: 'password123'
  }
];

/**
 * Seed the database with sample data
 */
const seedDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    logger.error('Cannot seed database in production!');
    process.exit(1);
  }

  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await Message.deleteMany({});
    logger.info('Cleared existing data');

    // Create users
    const saltRounds = 10;
    const createdUsers = [];

    for (const userData of users) {
      const salt = await bcrypt.genSalt(saltRounds);
      const passwordHash = await bcrypt.hash(userData.password, salt);
      
      const user = new User({
        username: userData.username,
        email: userData.email,
        passwordHash
      });
      
      await user.save();
      createdUsers.push(user);
    }

    logger.info(`Created ${createdUsers.length} users`);

    // Create a group room
    const groupRoom = new Room({
      name: 'General Chat',
      isGroup: true,
      members: createdUsers.map(user => user._id)
    });
    
    await groupRoom.save();
    
    // Create direct message room
    const dmRoom = new Room({
      isGroup: false,
      members: [createdUsers[0]._id, createdUsers[1]._id]
    });
    
    await dmRoom.save();
    
    logger.info('Created rooms');

    // Create some messages
    const messages = [
      {
        roomId: groupRoom._id,
        senderId: createdUsers[0]._id,
        content: 'Hello everyone!',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        roomId: groupRoom._id,
        senderId: createdUsers[1]._id,
        content: 'Hi John, how are you?',
        timestamp: new Date(Date.now() - 3000000)
      },
      {
        roomId: groupRoom._id,
        senderId: createdUsers[2]._id,
        content: 'Hey folks, what\'s up?',
        timestamp: new Date(Date.now() - 2400000)
      },
      {
        roomId: dmRoom._id,
        senderId: createdUsers[0]._id,
        content: 'Hi Jane, can we talk privately?',
        timestamp: new Date(Date.now() - 1800000)
      },
      {
        roomId: dmRoom._id,
        senderId: createdUsers[1]._id,
        content: 'Sure John, what\'s going on?',
        timestamp: new Date(Date.now() - 1200000)
      }
    ];

    await Message.insertMany(messages);
    logger.info(`Created ${messages.length} messages`);

    // Update user joinedRooms
    for (const user of createdUsers) {
      const userRooms = await Room.find({ members: user._id });
      user.joinedRooms = userRooms.map(room => room._id);
      await user.save();
    }

    logger.info('Updated user joined rooms');
    logger.info('Database seeded successfully');
    
    // Disconnect
    await mongoose.disconnect();
    
  } catch (error) {
    logger.error('Error seeding database', { error: error.message });
    process.exit(1);
  }
};

// Run as standalone script if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase; 