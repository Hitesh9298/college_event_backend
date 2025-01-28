// server/routes/groups.js
import express from 'express';
import auth from '../middleware/auth.js';
import Group from '../models/Group.js';

const router = express.Router();

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = new Group({
      name,
      description,
      creator: req.userId,
      members: [req.userId]
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all groups for a user
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId })
      .populate('members', 'username email')
      .populate('creator', 'username email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a group
router.post('/:groupId/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.members.includes(req.userId)) {
      return res.status(400).json({ error: 'Already a member' });
    }

    group.members.push(req.userId);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;