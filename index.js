const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chitify', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define schema and model for chat messages
const chatMessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200", // Adjust the origin accordingly
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

io.on('connection', (socket) => {
    console.log('New client connected');

    // Join room based on user ID when they connect
    socket.on('joinRoom', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    socket.on('message', async (message) => {
        console.log('Received message:', message);
        try {
            // Save message to MongoDB
            const newMessage = new ChatMessage({
                senderId: message.senderId,
                receiverId: message.receiverId,
                message: message.message
            });
            await newMessage.save();
            
            // Emit message to both sender and receiver
            io.to(message.senderId).emit('message', message);
            io.to(message.receiverId).emit('message', message);
        } catch (error) {
            console.error('Error saving message:', error);
            // Emit error event back to client
            socket.emit('error', 'Error saving message');
        }
    });
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
