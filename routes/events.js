import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Event from '../models/Event.js';
import { upload } from '../config/uploadConfig.js';
import cloudinary from '../config/cloudinary.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Register for event - Changed 'auth' to 'protect'
router.post('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already registered
    if (event.participants.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Check if event is full
    if (event.participants.length >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full' });
    }

    event.participants.push(req.user._id);
    await event.save();

    res.json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Error registering for event' });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const { category, date, location } = req.query;
    let query = {};

    if (category) query.category = category;
    if (date) query.date = new Date(date);
    if (location) query.location = new RegExp(location, 'i');

    const events = await Event.find(query)
      .populate('creator', 'name email')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create event
router.post('/', protect, async (req, res) => {
  try {
    console.log("Incoming Event Data:", req.body); // Debugging log

    if (!req.body.image) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const eventData = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      time: req.body.time,
      venue: req.body.venue,
      category: req.body.category,
      maxParticipants: parseInt(req.body.maxParticipants) || 100,
      creator: req.user._id,
      image: req.body.image,  // ✅ Get the correct image URL from frontend
      organizer: {
        name: req.body.organizerName || 'Default Organizer',
        description: req.body.organizerDescription || ''
      },
      schedule: JSON.parse(req.body.schedule || '[]')
    };

    console.log("Final Event Data before saving:", eventData); // Debugging log

    const event = new Event(eventData);
    await event.save();
    const populatedEvent = await Event.findById(event._id).populate('creator');

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({ message: error.message });
  }
});
// Delete event
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Extract public ID from Cloudinary URL
    if (event.image) {
      try {
        const urlParts = event.image.split('/');
        const filenameWithExtension = urlParts[urlParts.length - 1]; 
        const publicId = `events/${filenameWithExtension.split('.')[0]}`; // Ensure folder is included

        console.log(`Deleting Cloudinary image: ${publicId}`);
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error('Cloudinary Delete Error:', deleteError);
      }
    }

    await event.deleteOne();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get event by ID with populated fields
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('participants', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Error fetching event details' });
  }
});

// Unregister from event
router.delete('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const participantIndex = event.participants.indexOf(req.user.id);
    if (participantIndex === -1) {
      return res.status(400).json({ error: 'Not registered for this event' });
    }

    event.participants.splice(participantIndex, 1);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save/unsave an event
router.post('/:id/save', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isSaved = event.savedBy.includes(req.user._id);
    if (isSaved) {
      // Remove user from savedBy array
      event.savedBy = event.savedBy.filter(id => id.toString() !== req.user._id.toString());
    } else {
      // Add user to savedBy array
      event.savedBy.push(req.user._id);
    }

    await event.save();
    res.json({ message: isSaved ? 'Event unsaved' : 'Event saved', isSaved: !isSaved });
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json({ message: 'Error saving event' });
  }
});

// Get user's events
router.get('/user', protect, async (req, res) => {
  try {
    const events = await Event.find({ participants: req.user.id })
      .populate('creator', 'username')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get saved events for a user
router.get('/user/saved', protect, async (req, res) => {
  try {
    const events = await Event.find({
      savedBy: req.user._id
    }).populate('creator', 'name email');
    res.json(events);
  } catch (error) {
    console.error('Error fetching saved events:', error);
    res.status(500).json({ message: 'Error fetching saved events' });
  }
});

export default router;