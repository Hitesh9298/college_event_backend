import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import messageRoutes from './routes/messages.js';
import eventRoutes from './routes/events.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import initializeSocket from './socket.js';
import contactRouter from './routes/contact.js';  // Note the .js extension


// Configure multer for image upload
// Replace existing multer config with:


dotenv.config();

const app = express();
const httpServer = createServer(app);

// Trust proxy configuration
app.set('trust proxy', 1); // Trust first proxy

// Configure rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.'
    });
  }
});

// CORS configuration
const corsOptions = {
  origin: ['https://clgevent.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply security headers first
app.use(helmet());

// Apply rate limiter to all routes
app.use(limiter);

// Enable CORS with options
app.use(cors(corsOptions));

// Body parser middleware
// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Middleware
app.use((req, res, next) => {
  console.log('Incoming Request:', req.method, req.url, req.body);
  next();
});

// Add this before your routes
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large. Max size is 5MB' });
    }
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/contact', contactRouter);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 4000;

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
