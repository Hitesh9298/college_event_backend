import express from 'express';
import auth from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// Get messages for a specific chat (group or private)
router.get('/', auth, async (req, res) => {
  try {
    const { groupId, userId } = req.query;
    let query;

    if (groupId) {
      query = { groupId };
    } else if (userId) {
      query = {
        $or: [
          { sender: req.userId, receiverId: userId },
          { sender: userId, receiverId: req.userId }
        ]
      };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username profileName') // Populate both username and profileName
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a new message
router.post('/', auth, async (req, res) => {
  try {
    const { content, groupId, receiverId, type, fileUrl } = req.body;
    const message = new Message({
      sender: req.userId,
      content,
      groupId,
      receiverId,
      type,
      fileUrl
    });

    await message.save();
    await message.populate('sender', 'username profileName'); // Populate both username and profileName
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;