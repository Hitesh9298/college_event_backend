import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const format = file.mimetype.split('/')[1]; // Extracts the format dynamically
    return {
      folder: 'events',
      format: format === 'jpeg' ? 'jpg' : format, // Convert jpeg to jpg
      public_id: `event-${Date.now()}-${file.originalname.split('.')[0]}`,
      transformation: [{ width: 1000, height: 1000, crop: "limit" }]
    };
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

export { upload };
