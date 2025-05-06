const Room = require('../models/Room');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Get all rooms for current user
exports.getUserRooms = async (req, res) => {
  try {
    // Find rooms where the user is either a member or the owner
    const rooms = await Room.find({
      $or: [
        { members: req.userId },
        { owner: req.userId }
      ]
    })
    .populate('members', 'username')
    .populate('owner', 'username email')
    .lean();
    
    // Transform the response to include owner information and ownership status
    const transformedRooms = rooms.map(room => {
      // Ensure owner exists before accessing properties
      const ownerId = room.owner?._id?.toString() || '';
      const isOwner = ownerId === req.userId.toString();
      
      return {
        ...room,
        isOwner,
        isMember: room.members.some(member => member._id.toString() === req.userId.toString()),
        owner: ownerId,
        ownerInfo: room.owner ? {
          username: room.owner.username,
          email: room.owner.email
        } : null
      };
    });

    // Sort rooms: owned rooms first, then member rooms
    const sortedRooms = transformedRooms.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return 0;
    });
    
    res.json(sortedRooms);
  } catch (err) {
    console.error('Error in getUserRooms:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get a specific room
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('members', 'username')
      .lean();
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is a member of the room
    if (!room.members.some(member => member._id.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this room' });
    }
    
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, isGroup, memberIds } = req.body;
    
    // Validate and clean memberIds
    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'Member IDs must be an array' });
    }

    // Filter out invalid member IDs
    const validMemberIds = memberIds.filter(id => 
      id && typeof id === 'string' && id.trim() !== '' && mongoose.Types.ObjectId.isValid(id)
    );

    if (validMemberIds.length === 0) {
      return res.status(400).json({ error: 'No valid member IDs provided' });
    }

    if (typeof isGroup !== 'boolean') {
      return res.status(400).json({ error: 'isGroup must be a boolean' });
    }
    
    // Ensure current user is included in members and set as owner
    const ownerId = req.userId;
    let members = [...new Set([...validMemberIds, ownerId])];
    
    // Verify all members exist
    const membersExist = await User.find({ _id: { $in: members } });
    if (membersExist.length !== members.length) {
      return res.status(400).json({ error: 'One or more users do not exist' });
    }
    
    // For direct messages (non-group chats), check if a room already exists
    if (!isGroup && members.length === 2) {
      const existingRoom = await Room.findOne({
        isGroup: false,
        members: { $all: members, $size: 2 }
      });
      
      if (existingRoom) {
        const populatedRoom = await Room.findById(existingRoom._id)
          .populate('members', 'username')
          .populate('owner', 'username email')
          .lean();
        
        return res.json(populatedRoom);
      }
    }
    
    // Create new room with owner
    const newRoom = new Room({
      name: name || '',
      isGroup,
      members,
      owner: ownerId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newRoom.save();
    
    // Add room to users' joinedRooms array
    await User.updateMany(
      { _id: { $in: members } },
      { $addToSet: { joinedRooms: newRoom._id } }
    );
    
    // Get populated room with all details
    const populatedRoom = await Room.findById(newRoom._id)
      .populate('members', 'username')
      .populate('owner', 'username email')
      .lean();
    
    // Transform response to include owner information
    const response = {
      ...populatedRoom,
      isOwner: true,
      owner: populatedRoom.owner._id.toString(),
      ownerInfo: {
        username: populatedRoom.owner.username,
        email: populatedRoom.owner.email
      }
    };
    
    res.status(201).json(response);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: err.message 
    });
  }
};

// Add a user to a group room
exports.addUserToRoom = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const { userId } = req.body;

    // Find the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if the room is a group chat
    if (!room.isGroup) {
      return res.status(400).json({ error: 'Cannot add users to a personal chat' });
    }

    // Check if the current user is a member of the room
    if (!room.members.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to add users to this room' });
    }

    // Check if the user to be added exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the user is already in the room
    if (room.members.includes(userId)) {
      return res.status(400).json({ error: 'User is already in the room' });
    }

    // Add the user to the room
    room.members.push(userId);
    await room.save();

    // Add the room to the user's joinedRooms
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { joinedRooms: roomId } }
    );

    // Get the updated room with populated members
    const updatedRoom = await Room.findById(roomId)
      .populate('members', 'username')
      .lean();

    res.json(updatedRoom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove a user from a group room
exports.removeUserFromRoom = async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    // Find the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if the room is a group chat
    if (!room.isGroup) {
      return res.status(400).json({ error: 'Cannot remove users from a personal chat' });
    }

    // Check if the current user is a member of the room
    if (!room.members.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized to remove users from this room' });
    }

    // Check if the user to be removed exists
    const userToRemove = await User.findById(userId);
    if (!userToRemove) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the user is in the room
    if (!room.members.includes(userId)) {
      return res.status(400).json({ error: 'User is not in this room' });
    }

    // Remove the user from the room
    room.members = room.members.filter(memberId => memberId.toString() !== userId);
    await room.save();

    // Remove the room from the user's joinedRooms
    await User.findByIdAndUpdate(
      userId,
      { $pull: { joinedRooms: roomId } }
    );

    // Get the updated room with populated members
    const updatedRoom = await Room.findById(roomId)
      .populate('members', 'username')
      .lean();

    // Emit socket event to notify other users
    if (req.io) {
      req.io.to(roomId).emit('user_removed', {
        roomId,
        userId,
        updatedRoom
      });
    }

    res.json(updatedRoom);
  } catch (err) {
    console.error('Error removing user from room:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a room
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Find the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if the current user is the owner of the room
    if (room.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ 
        error: 'Unauthorized',
        message: 'Only the room owner can delete this room' 
      });
    }

    // Delete the room
    await Room.findByIdAndDelete(roomId);

    // Remove room from all members' joinedRooms
    await User.updateMany(
      { joinedRooms: roomId },
      { $pull: { joinedRooms: roomId } }
    );

    // Emit socket event to notify all members
    if (req.io) {
      req.io.to(roomId).emit('room_deleted', { roomId });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Error deleting room:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: err.message 
    });
  }
}; 

exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    // Tìm phòng
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Kiểm tra xem user có trong phòng không
    if (!room.members.includes(userId)) {
      return res.status(400).json({ error: 'You are not a member of this room' });
    }

    // Gỡ user khỏi danh sách thành viên
    room.members = room.members.filter(memberId => memberId.toString() !== userId);
    await room.save();

    // Gỡ room khỏi joinedRooms của user
    await User.findByIdAndUpdate(
      userId,
      { $pull: { joinedRooms: roomId } }
    );

    // Gửi socket thông báo user đã rời phòng
    if (req.io) {
      req.io.to(roomId).emit('user_left', {
        roomId,
        userId
      });
    }

    res.json({ message: 'You have left the room successfully.' });
  } catch (err) {
    console.error('Error leaving room:', err);
    res.status(500).json({ error: 'Server error' });
  }
};