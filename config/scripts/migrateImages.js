import cloudinary from '../config/cloudinary.js';
import Event from '../models/Event.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrateImages() {
  try {
    const events = await Event.find();
    
    for (const event of events) {
      if (event.image && event.image.startsWith('uploads/')) {
        try {
          const result = await cloudinary.uploader.upload(event.image);
          event.image = result.secure_url;
          await event.save();
          console.log(`Migrated image for event: ${event._id}`);
        } catch (err) {
          console.error(`Failed to migrate image for event: ${event._id}`, err);
        }
      }
    }
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateImages();