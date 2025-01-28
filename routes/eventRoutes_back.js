import express from 'express';
import { upload } from '../server.js';
import { protect } from '../middleware/authMiddleware.js';
import Event from '../models/Event.js';

const router = express.Router();


// Create event route with optional image upload
// Create event with image upload
router.post('/', protect, upload.single('image'), async (req, res) => {
	try {
	  const eventData = {
		...req.body,
		creator: req.user._id
	  };
  
	  if (req.file) {
		eventData.image = `/uploads/events/${req.file.filename}`;
	  }
  
	  const event = await Event.create(eventData);
	  res.status(201).json(event);
	} catch (error) {
	  console.error('Error creating event:', error);
	  res.status(400).json({ message: error.message });
	}
  });
  

// ... rest of the routes

// Get all events
router.get('/', async (req, res) => {
	try {
		const events = await Event.find().populate('creator', 'name email');
		res.json(events);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Get single event
router.get('/:id', async (req, res) => {
	try {
		const event = await Event.findById(req.params.id).populate('creator', 'name email');
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}
		res.json(event);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// Update event
router.put('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const eventData = { ...req.body };
    if (req.file) {
      eventData.image = `/uploads/events/${req.file.filename}`;
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      eventData,
      { new: true }
    );
    res.json(updatedEvent);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Delete event
router.delete('/:id', protect, async (req, res) => {
	try {
		const event = await Event.findById(req.params.id);
		if (!event) {
			return res.status(404).json({ message: 'Event not found' });
		}

		if (event.creator.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: 'Not authorized to delete this event' });
		}

		await event.remove();
		res.json({ message: 'Event removed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

export default router;
