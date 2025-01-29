import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'events',
      allowed_formats: ['jpg', 'png', 'jpeg'],
      transformation: [{ width: 1000, height: 1000, crop: "limit" }],
      // Add unique filename
      public_id: (req, file) => `event-${Date.now()}-${file.originalname.split('.')[0]}`
    }
  });

  export const upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images are allowed!'), false);
      }
    }
  });