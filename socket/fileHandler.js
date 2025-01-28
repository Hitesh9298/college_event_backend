const handleFileUpload = (io, socket, userSocketMap) => {
  socket.on('sendFile', (fileData) => {
    try {
      console.log('Received file data:', {
        receiver: fileData.receiver,
        type: fileData.type,
        sender: fileData.sender
      });

      // Basic validation
      if (!fileData || !fileData.file || !fileData.receiver) {
        throw new Error('Invalid file data');
      }

      // File data validation
      if (!fileData.file.data || !fileData.file.data.startsWith('data:')) {
        throw new Error('Invalid file format');
      }

      // Size validation (5MB limit)
      const base64Data = fileData.file.data.split(',')[1];
      const fileSize = Buffer.from(base64Data, 'base64').length;
      if (fileSize > 5 * 1024 * 1024) {
        throw new Error('File size too large (max 5MB)');
      }

      const message = {
        ...fileData,
        timestamp: Date.now(),
        messageType: 'file',
        status: 'success',
        fileSize
      };

      // Handle group messages
      if (fileData.type === 'group') {
        socket.to(fileData.receiver).emit('receiveFile', message); // Emit to all other users in the group
        socket.emit('fileSent', { status: 'success', message }); // Emit to the sender
      } else {
        // For private messages
        const recipientSocketData = userSocketMap.get(fileData.receiver);
        if (!recipientSocketData) {
          throw new Error('Recipient not found or offline');
        }

        io.to(recipientSocketData.socketId).emit('receiveFile', message);
        socket.emit('fileSent', { status: 'success', message });
      }

    } catch (error) {
      console.error('File upload error:', error);
      socket.emit('fileError', {
        error: error.message,
        status: 'error'
      });
    }
  });
};

export default handleFileUpload;