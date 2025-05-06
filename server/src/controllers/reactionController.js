const MessageReaction = require('../models/MessageReaction');
const { getSocket } = require('../utils/socket');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// Add a reaction to a message
exports.addReaction = async (req, res) => {
  try {
    const { reaction } = req.body;
    const { messageId } = req.params;

    

    // Decode JWT from Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    let userId;
    try {
      const decoded = jwt.verify(token, jwtSecret);
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const existingReaction = await MessageReaction.findOne({
      messageId,
      userId,
      reaction,
    });

    if (existingReaction) {
      await MessageReaction.findByIdAndDelete(existingReaction._id);
      const socket = getSocket();
      socket?.emit('reaction_removed', { messageId, userId, reaction });
      return res.status(200).json({ message: 'Reaction removed' });
    }

    const newReaction = await MessageReaction.create({
      messageId,
      userId,
      reaction,
    });

    const populatedReaction = await MessageReaction.findById(newReaction._id)
      .populate('userId', 'username')
      .lean();

  
    res.status(201).json(populatedReaction);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Error adding reaction' });
  }
};

// Get all reactions for a message
exports.getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;

    const reactions = await MessageReaction.find({ messageId })
      .populate('userId', 'username')
      .lean();

    res.status(200).json(reactions);
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({ message: 'Error getting reactions' });
  }
};

exports.removeReaction = async (req, res) => {
  const { messageId, reactionId } = req.params;
   // Decode JWT from Authorization header
   const authHeader = req.header('Authorization');
   if (!authHeader) {
     return res.status(401).json({ message: 'No token provided' });
   }
   const token = authHeader.split(' ')[1];
   if (!token) {
     return res.status(401).json({ message: 'No token provided' });
   }
   let userId;
   try {
     const decoded = jwt.verify(token, jwtSecret);
     userId = decoded.id;
   } catch (err) {
     return res.status(401).json({ message: 'Invalid token' });
   }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const reaction = await MessageReaction.findById(reactionId);

    if (!reaction) {
      return res.status(404).json({ message: 'Reaction not found' });
    }

    // Ensure reaction belongs to the given message
    if (reaction.messageId.toString() !== messageId) {
      return res.status(400).json({ message: 'Reaction does not belong to the specified message' });
    }

    // Ensure the user owns the reaction
    if (reaction.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove this reaction' });
    }

    await reaction.deleteOne();



    return res.status(200).json({ messageId,
      userId,
      reaction: reaction.reaction});
  } catch (error) {
    console.error('Error removing reaction:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
