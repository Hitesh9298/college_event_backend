import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { body, param, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import { v2 as cloudinary } from 'cloudinary';
import { validateRequest } from '../middleware/validateRequest.js';



const router = express.Router();

// Create a cache map to store events data
const cache = new Map(); // Simple in-memory cach

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



// Register for event with validation
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
// GET all events with caching
router.get('/', async (req, res) => {
  try {
    const { category, date, location } = req.query;
    let query = {};

    if (category) query.category = category;
    if (date) query.date = new Date(date);
    if (location) query.location = new RegExp(location, 'i');

    // Check cache first
    const cacheKey = JSON.stringify({ category, date, location });
    if (cache.has(cacheKey)) {
      console.log('Cache hit');
      return res.json(cache.get(cacheKey)); // Return cached data
    }

    // If not in cache, fetch from database
    console.log('Cache miss, querying DB...');
    const events = await Event.find(query)
      .populate('creator', 'name email')
      .sort({ date: 1 });

    // Store the result in the cache
    cache.set(cacheKey, events);

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create event with validation
// Create event with form data (image already uploaded to Cloudinary)
// Example of a route to clear the cache (e.g., after event creation or update)
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, date, time, venue, category, maxParticipants, organizerName, organizerDescription, image, schedule } = req.body;

    let parsedSchedule = [];
    if (schedule) {
      try {
        parsedSchedule = JSON.parse(schedule);
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid schedule format',
          errors: [{ msg: 'Schedule must be a valid JSON array' }]
        });
      }
    }

    const event = await Event.create({
      title,
      description,
      date,
      time,
      venue,
      category,
      maxParticipants: parseInt(maxParticipants) || 100,
      creator: req.user._id,
      image,
      organizer: {
        name: organizerName || 'Default Organizer',
        description: organizerDescription || ''
      },
      schedule: parsedSchedule
    });

    const populatedEvent = await Event.findById(event._id).populate('creator', 'name email');

    // After creating a new event, clear the cache as the data has changed
    cache.clear(); // Clear the cache (or you can clear only relevant cache keys)

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({ 
      message: 'Error creating event',
      errors: error.errors || [{ msg: error.message }]
    });
  }
});

// Other routes (register, unregister, etc.) remain the same...
// Delete event
router.delete(
  '/:id',
  protect,
  param('id').isMongoId().withMessage('Invalid event ID'),
  validateRequest,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });

      if (event.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this event' });
      }

      if (event.image) {
        try {
          const urlParts = event.image.split('/');
          const filenameWithExtension = urlParts[urlParts.length - 1]; 
          const publicId = `events/${filenameWithExtension.split('.')[0]}`;

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
  }
);

// Get event by ID with validation
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

// Register for event
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
// Unregister from event
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

// Save/Unsave an event
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
