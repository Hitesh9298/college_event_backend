import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  bio: { type: String },
  profilePicture: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  profileName: { type: String },
  savedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }]
});

const User = mongoose.model('User', userSchema);

export default User;