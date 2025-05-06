/**
 * Models index file
 * 
 * Exports all models from a single location for easier imports
 */

const User = require('./User');
const Room = require('./Room');
const Message = require('./Message');

module.exports = {
  User,
  Room,
  Message
}; 