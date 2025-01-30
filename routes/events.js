import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { body, param, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import cloudinary from '.\config\cloudinary.js';

const router = express.Router();



// Middleware to handle validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register for event with validation
router.post(
  '/:id/register',
  protect,
  param('id').isMongoId().withMessage('Invalid event ID'),
  validateRequest,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      if (event.participants.includes(req.user._id)) {
        return res.status(400).json({ message: 'Already registered for this event' });
      }

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
  }
);

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

// Create event with validation
router.post(
  '/',
  protect,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('date').isISO8601().toDate().withMessage('Valid date is required'),
    body('time').notEmpty().withMessage('Time is required'),
    body('venue').notEmpty().withMessage('Venue is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('maxParticipants').optional().isInt({ min: 1 }).withMessage('Max participants must be a positive number')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const eventData = {
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        time: req.body.time,
        venue: req.body.venue,
        category: req.body.category,
        maxParticipants: parseInt(req.body.maxParticipants) || 100,
        creator: req.user._id,
        image: req.body.image || '', 
        organizer: {
          name: req.body.organizerName || 'Default Organizer',
          description: req.body.organizerDescription || ''
        },
        schedule: JSON.parse(req.body.schedule || '[]')
      };

      const event = new Event(eventData);
      await event.save();
      const populatedEvent = await Event.findById(event._id).populate('creator');

      res.status(201).json(populatedEvent);
    } catch (error) {
      console.error('Event creation error:', error);
      res.status(400).json({ message: error.message });
    }
  }
);

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
router.get(
  '/:id',
  param('id').isMongoId().withMessage('Invalid event ID'),
  validateRequest,
  async (req, res) => {
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
  }
);

// Save/Unsave an event
router.post(
  '/:id/save',
  protect,
  param('id').isMongoId().withMessage('Invalid event ID'),
  validateRequest,
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const isSaved = event.savedBy.includes(req.user._id);
      if (isSaved) {
        event.savedBy = event.savedBy.filter(id => id.toString() !== req.user._id.toString());
      } else {
        event.savedBy.push(req.user._id);
      }

      await event.save();
      res.json({ message: isSaved ? 'Event unsaved' : 'Event saved', isSaved: !isSaved });
    } catch (error) {
      console.error('Error saving event:', error);
      res.status(500).json({ message: 'Error saving event' });
    }
  }
);

export default router;
