import mongoose from 'mongoose';
import { type } from 'os';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['academic', 'cultural', 'sports', 'workshop', 'career','music', 'technology','other']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizer: {
    name: {
      type: String,
      required: true
    },
    description: String
  },
  schedule: [{
    time: String,
    activity: String,
  }],
  maxParticipants: {
    type: Number,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  image: {
    type: String,
    default: '' // Make image optional
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  }
}, {
  timestamps: true
});

// Virtual for current participants count
eventSchema.virtual('currentParticipants').get(function() {
  return this.participants.length;
});

// Virtual for checking if event is full
eventSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.maxParticipants;
});

// Method to check if user can register
eventSchema.methods.canRegister = function(userId) {
  return !this.participants.includes(userId) && !this.isFull;
};

const Event = mongoose.model('Event', eventSchema);

export default Event;