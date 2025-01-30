import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Event title is required"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "Event description is required"]
  },
  date: {
    type: Date,
    required: [true, "Event date is required"]
  },
  time: {
    type: String,
    required: [true, "Event time is required"]
  },
  location: {
    type: String,
    required: [true, "Event location is required"]
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ['academic', 'cultural', 'sports', 'workshop', 'career', 'music', 'technology', 'other']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Creator ID is required"]
  },
  organizer: {
    name: {
      type: String,
      required: [true, "Organizer name is required"]
    },
    description: {
      type: String,
      default: "No description provided"
    }
  },
  schedule: [{
    time: {
      type: String,
      required: [true, "Schedule time is required"]
    },
    activity: {
      type: String,
      required: [true, "Schedule activity is required"]
    }
  }],
  maxParticipants: {
    type: Number,
    required: [true, "Maximum participants count is required"],
    min: [1, "At least one participant is required"]
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
    required: [true, "Image URL is required"]
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  }
}, {
  timestamps: true
});

// ✅ Virtual fields
eventSchema.virtual('currentParticipants').get(function () {
  return this.participants.length;
});

eventSchema.virtual('isFull').get(function () {
  return this.participants.length >= this.maxParticipants;
});

// ✅ Method to check if user can register
eventSchema.methods.canRegister = function (userId) {
  return !this.participants.includes(userId) && !this.isFull;
};

const Event = mongoose.model('Event', eventSchema);
export default Event;
