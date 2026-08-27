const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

// Models
const Message = require('./models/Message');
const Room = require('./models/Room');
const User = require('./models/User');
const LoginLog = require('./models/LoginLog'); // Brute Force protection log

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration for local development
const io = new Server(server, {
    cors: { 
        origin: "http://localhost:5173", 
        methods: ["GET", "POST"] 
    }
});

app.use(cors());
app.use(express.json());

// Helper function to generate a random 6-character room invite code
const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ==========================================
//           USER API ENDPOINTS
// ==========================================

// Register a new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, uniqueId, password, avatar } = req.body;
        const existingUser = await User.findOne({ uniqueId });
        if (existingUser) return res.status(400).json({ error: "This ID is already in use!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username, uniqueId, password: hashedPassword,
            avatar: avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            friends: [], friendRequests: [], rooms: [], bio: ""
        });
        
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: "Server error occurred during registration!" });
    }
});

// User Login with Brute Force Protection (Rate Limiting)
app.post('/api/users/login', async (req, res) => {
    try {
        const { uniqueId, password } = req.body;
        const user = await User.findOne({ uniqueId });
        
        if (!user) {
            // Log failed attempt for non-existent user
            await LoginLog.create({ uniqueId, status: 'failed', ipAddress: req.ip });
            return res.status(404).json({ error: "User not found!" });
        }

        // 1. CHECK: Is the user currently locked out?
        if (user.lockoutEndsAt && user.lockoutEndsAt > Date.now()) {
            const remainingSeconds = Math.ceil((user.lockoutEndsAt - Date.now()) / 1000);
            await LoginLog.create({ uniqueId, status: 'blocked', ipAddress: req.ip });
            
            return res.status(429).json({ 
                error: "Access denied! Account locked.", 
                lockoutSeconds: remainingSeconds 
            });
        }

        // 2. PASSWORD VERIFICATION
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // Create a failed login log
            await LoginLog.create({ uniqueId, status: 'failed', ipAddress: req.ip });

            // Count failed attempts in the last 10 seconds
            const tenSecondsAgo = new Date(Date.now() - 10000);
            const recentFails = await LoginLog.countDocuments({
                uniqueId,
                status: 'failed',
                createdAt: { $gte: tenSecondsAgo } // $gte: Greater than or equal to
            });

            // If 5 or more failed attempts within 10 seconds, apply the lockout penalty!
            if (recentFails >= 5) {
                const multiplier = user.penaltyMultiplier || 1;
                const lockoutDuration = 30 * 1000 * multiplier; // 30s * Multiplier

                user.lockoutEndsAt = new Date(Date.now() + lockoutDuration);
                user.penaltyMultiplier = multiplier + 1; // Increase penalty for the next potential violation
                await user.save();

                return res.status(429).json({ 
                    error: "Too many failed attempts. Account locked!", 
                    lockoutSeconds: lockoutDuration / 1000 
                });
            }

            return res.status(400).json({ error: "Incorrect password!" });
        }

        // 3. SUCCESSFUL LOGIN: Clear all penalties and locks
        user.lockoutEndsAt = null;
        user.penaltyMultiplier = 1;
        await user.save();
        
        await LoginLog.create({ uniqueId, status: 'success', ipAddress: req.ip });

        user.password = undefined; // Prevent sending password hash to the client
        res.json(user);

    } catch (err) {
        res.status(500).json({ error: "Server error occurred during login!" });
    }
});

// Update user profile
app.put('/api/users/update', async (req, res) => {
    try {
        const { uniqueId, username, avatar, bio } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { uniqueId }, { username, avatar, bio }, { new: true }
        );
        if (!updatedUser) return res.status(404).json({ error: "User not found." });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile." });
    }
});

// Send a friend request
app.post('/api/users/send-request', async (req, res) => {
    try {
        const { myId, friendUniqueId } = req.body;

        if (!friendUniqueId.startsWith('@')) return res.status(400).json({ error: "ID must start with '@' (e.g., @user123)" });
        const targetId = friendUniqueId.substring(1);
        if (myId === targetId) return res.status(400).json({ error: "You cannot add yourself!" });

        const friend = await User.findOne({ uniqueId: targetId });
        if (!friend) return res.status(404).json({ error: "User not found!" });

        const me = await User.findOne({ uniqueId: myId });
        if (!me) return res.status(404).json({ error: "Your profile was not found!" });

        if (!me.friends) me.friends = [];
        if (!me.friendRequests) me.friendRequests = [];
        if (!friend.friendRequests) friend.friendRequests = [];

        if (me.friends.includes(friend.uniqueId)) return res.status(400).json({ error: "This user is already in your friend list!" });
        if (friend.friendRequests.includes(myId)) return res.status(400).json({ error: "Request already sent!" });
        if (me.friendRequests.includes(targetId)) return res.status(400).json({ error: "This user already sent you a request. Check your requests!" });

        friend.friendRequests.push(myId);
        await friend.save();
        
        // Emit a signal to instantly update the receiver's UI
        io.emit('friend_data_updated', { targetId: targetId });

        res.json({ message: "Friend request sent successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Server error occurred while sending request." });
    }
});

// Get pending friend requests
app.get('/api/users/requests/:myId', async (req, res) => {
    try {
        const user = await User.findOne({ uniqueId: req.params.myId });
        if (!user) return res.status(404).json({ error: "User not found." });

        if (!user.friendRequests || user.friendRequests.length === 0) return res.json([]);

        const requestsDetails = await User.find({ 
            uniqueId: { $in: user.friendRequests } 
        }).select('username uniqueId avatar');
        
        res.json(requestsDetails);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch friend requests." });
    }
});

// Respond to a friend request (accept/reject)
app.post('/api/users/respond-request', async (req, res) => {
    try {
        const { myId, senderId, action } = req.body;
        const me = await User.findOne({ uniqueId: myId });
        const sender = await User.findOne({ uniqueId: senderId });

        if (!me || !sender) return res.status(404).json({ error: "User not found." });

        if (me.friendRequests) me.friendRequests = me.friendRequests.filter(id => id !== senderId);

        if (action === 'accept') {
            if (!me.friends) me.friends = [];
            if (!sender.friends) sender.friends = [];
            if (!me.friends.includes(senderId)) me.friends.push(senderId);
            if (!sender.friends.includes(myId)) sender.friends.push(myId);
            await sender.save();
        }

        await me.save();

        // Emit signals to instantly update both users' friend lists
        io.emit('friend_data_updated', { targetId: senderId });
        io.emit('friend_data_updated', { targetId: myId });

        res.json({ message: `Request ${action}ed.` });
    } catch (err) {
        res.status(500).json({ error: "Server error processing request." });
    }
});

// Get user's friend list
app.get('/api/users/friends/:myId', async (req, res) => {
    try {
        const user = await User.findOne({ uniqueId: req.params.myId });
        if (!user) return res.status(404).json({ error: "User not found." });

        const friendsDetails = await User.find({ 
            uniqueId: { $in: user.friends || [] } 
        }).select('username uniqueId avatar bio');
        
        res.json(friendsDetails);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch friend list." });
    }
});

// ==========================================
//           ROOM API ENDPOINTS
// ==========================================

// Get all rooms for a specific user
app.get('/api/rooms/:userId', async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.params.userId }).sort({ updatedAt: -1 });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new room
app.post('/api/rooms', async (req, res) => {
    try {
        const { name, creator, isPrivate } = req.body;
        const newRoom = new Room({ 
            name, creator, isPrivate,
            inviteCode: generateInviteCode(), members: [creator] 
        });
        await newRoom.save();
        res.json(newRoom);
    } catch (err) {
        res.status(400).json({ error: "Failed to create room." });
    }
});

// Join an existing room using an invite code
app.post('/api/rooms/join', async (req, res) => {
    try {
        const { userId, inviteCode } = req.body;
        const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!room) return res.status(404).json({ error: "Invalid invite code!" });
        if (!room.members.includes(userId)) {
            room.members.push(userId);
            await room.save();
        }
        res.json(room);
    } catch (err) {
        res.status(500).json({ error: "An error occurred while joining the room." });
    }
});

// Fetch REST API messages for a specific room
app.get('/api/messages/:room', async (req, res) => {
    try {
        const { room } = req.params;
        const messages = await Message.find({ room: room }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
//          REAL-TIME SOCKET.IO LOGIC
// ==========================================

io.on('connection', (socket) => {
    
    // Triggered when a user clicks/opens a specific chat room
    socket.on('join_room', async (roomName) => {
        socket.join(roomName);
        console.log(`User joined room: ${roomName}`);

        try {
            // FIX: Fetch the chat history for this specific room from MongoDB
            // Sorting by createdAt: 1 ensures messages are displayed oldest to newest
            const history = await Message.find({ room: roomName }).sort({ createdAt: 1 });
            
            // Emit the retrieved history ONLY to the user who just joined
            socket.emit('message_history', history);
        } catch (err) {
            console.log("Error fetching message history:", err);
        }
    });
    
    // Handle incoming new messages
    socket.on('send_message', async (data) => {
        try {
            // Save the new message to the MongoDB database
            const newMessage = new Message({
                sender: data.sender, senderId: data.senderId,
                content: data.text, room: data.room, readBy: [data.senderId] 
            });
            await newMessage.save();

            // Broadcast the saved message to everyone currently in the room
            io.to(data.room).emit('receive_message', { 
                _id: newMessage._id, sender: newMessage.sender, senderId: data.senderId,
                text: newMessage.content, room: newMessage.room, readBy: newMessage.readBy,
                createdAt: newMessage.createdAt 
            });
        } catch (err) { 
            console.log("Error sending message:", err); 
        }
    });

    // Mark messages as read by a specific user
    socket.on('mark_read', async ({ roomId, userId }) => {
        try {
            await Message.updateMany(
                { room: roomId, readBy: { $ne: userId } }, { $push: { readBy: userId } }
            );
            io.to(roomId).emit('messages_marked_read', { roomId, userId });
        } catch (err) { 
            console.log("Error marking as read:", err); 
        }
    });

    // Handle editing an existing message
    socket.on('edit_message', async ({ messageId, newText, roomId }) => {
        try {
            const updatedMessage = await Message.findByIdAndUpdate(messageId, { content: newText, isEdited: true }, { new: true });
            if(updatedMessage) io.to(roomId).emit('message_edited', { messageId, newText: updatedMessage.content });
        } catch (err) { 
            console.log("Error editing message:", err); 
        }
    });

    // Handle deleting a message (For Everyone or Just Me)
    socket.on('delete_message', async ({ messageId, roomId, userId, type }) => {
        try {
            if (type === 'everyone') {
                await Message.findByIdAndUpdate(messageId, { deletedForEveryone: true });
                io.to(roomId).emit('message_deleted', { messageId, type: 'everyone' });
            } else if (type === 'me') {
                await Message.findByIdAndUpdate(messageId, { $push: { deletedFor: userId } });
                socket.emit('message_deleted', { messageId, type: 'me', userId });
            }
        } catch (err) { 
            console.log("Error deleting message:", err); 
        }
    });

    // Handle clearing the entire chat history for a specific user
    socket.on('clear_chat', async ({ roomId, userId }) => {
      try {
        // Add this user's ID to the 'deletedFor' array of all messages in this room
        await Message.updateMany(
          { room: roomId },
          { $addToSet: { deletedFor: userId } }
        );
        
        // Emit a signal only to the requesting user to clear their UI
        socket.emit('chat_cleared', { roomId, userId });
      } catch (error) {
        console.error("Clear chat error:", error);
      }
    });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/taslak")
    .then(() => {
        console.log("📦 MongoDB Connection Successful!");
        server.listen(PORT, () => console.log(`✅ Server is running on port ${PORT}`));
    })
    .catch((err) => console.log(err.message));
