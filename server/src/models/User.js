const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email:    { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  friends:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 