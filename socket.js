import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';  // Add this import
import User from './models/User.js';
import Group from './models/Group.js';
import handleFileUpload from './socket/fileHandler.js';

// Store data in Maps for better performance
const onlineUsers = new Map();
const typingUsers = new Map();
const groupChats = new Map();

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ['https://clgevent.netlify.app'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      const username = socket.handshake.auth.username;
      const profileName = socket.handshake.auth.profileName;
// Get profileName from auth
      console.log('Socket auth attempt:', { userId, hasToken: !!token });

      if (!token || !userId) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(userId);

      if (!user) {
        return next(new Error('User not found'));
      }

     // Set socket user data
     socket.userId = userId;
     socket.username = username || user.username;
     socket.profileName = profileName || user.profileName;
     socket.user = user;
     console.log('Socket authenticated:', {
      userId,
      username: socket.username,
      profileName: socket.profileName
    });
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('online', async () => {
      try {
        const user = await User.findById(socket.userId);
        const userData = {
          userId: socket.userId,
          username: user.username,
          profileName: user.profileName,
          displayName: user.profileName || user.username, // Add display name
          socketId: socket.id,
          online: true
        };
    
        onlineUsers.set(socket.userId, userData);
        io.emit('updateUsers', Array.from(onlineUsers.values()));
      } catch (error) {
        console.error('Online status error:', error);
      }
    });

    // Handle sending messages
    
     // Update message handling

     socket.on('sendMessage', async (message) => {
      try {
        const user = await User.findById(socket.userId);
        const messageData = {
          ...message,
          id: Date.now().toString(),
          senderName: user.username || user.profileName,
          timestamp: Date.now()
        };
    
        // For group messages
        if (message.type === 'group') {
          // Join sender to group room if not already joined
          socket.join(message.receiver);
          // Broadcast to all in group except sender
          socket.to(message.receiver).emit('receiveMessage', messageData);
          // Send confirmation to sender
          socket.emit('messageSent', { status: 'sent', message: messageData });
        } 
        // For private messages
        else {
          const receiverData = onlineUsers.get(message.receiver);
          if (receiverData) {
            // Send only to receiver
            io.to(receiverData.socketId).emit('receiveMessage', messageData);
            // Send confirmation to sender without duplicating message
            socket.emit('messageSent', { status: 'sent', message: messageData });
          }
        }
    
      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    


    // Handle typing indicators
    socket.on('typing', ({ userId, receiverId }) => {
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        socket.to(receiverData.socketId).emit('userTyping', { userId });
      }
    });

    socket.on('stopTyping', ({ userId, receiverId }) => {
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        socket.to(receiverData.socketId).emit('userStoppedTyping', { userId });
      }
    });

    // Update createGroup handler
    socket.on('createGroup', async ({ groupId, groupName, members }) => {
      try {
        const memberDetails = await Promise.all(
          members.map(async (id) => {
            const user = await User.findById(id);
            return {
              userId: id,
              displayName: user.profileName || user.username
            };
          })
        );
    
        const group = new Group({
          groupId,
          name: groupName,
          members: memberDetails,
          createdBy: {
            userId: socket.userId,
            displayName: socket.user.profileName || socket.user.username
          }
        });
        await group.save();
        socket.join(groupId);
        io.emit('groupCreated', {
          groupId: group._id,
          name: groupName,
          members: memberDetails
        });
      } catch (error) {
        console.error('Group creation error:', error);
        socket.emit('error', { message: 'Failed to create group' });
      }
    });

    socket.on('joinGroup', async ({ groupId }) => {
      try {
        const group = await Group.findById(groupId);
        if (!group) {
          throw new Error('Group not found');
        }
        socket.join(groupId);
        console.log(`User ${socket.userId} joined group ${groupId}`);
      } catch (error) {
        console.error('Join group error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('updateUsers', Array.from(onlineUsers.values()));
      }
    });


    // Initialize file upload handler
    handleFileUpload(io, socket, onlineUsers);
  });

  return io;
};

export default initializeSocket;
