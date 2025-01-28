import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName: String
  }],
  createdBy: { 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName: String
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Group', groupSchema);