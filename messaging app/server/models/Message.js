// Import Mongoose for schema definition
const mongoose = require('mongoose');

// Define the Message schema
const messageSchema = new mongoose.Schema({
    // Name of the sender
    sender: { type: String, required: true },
    
    // Unique ID of the sender for identification
    senderId: { type: String, required: true },
    
    // Encrypted text content or file URL of the message
    content: { type: String, required: true },
    
    // Room ID where the message was sent (can be a DM room or a group room)
    room: { type: String, required: true },
    
    // Array of user uniqueIds who have read this message
    readBy: [{ type: String }],
    
    // Flag indicating if the message content has been edited after sending
    isEdited: { type: Boolean, default: false },
    
    // Flag indicating if the sender deleted this message for everyone in the room
    deletedForEveryone: { type: Boolean, default: false },
    
    // Array of user uniqueIds who have deleted this message only for themselves
    deletedFor: [{ type: String }], 
    
    // Timestamp when the message was created
    createdAt: { type: Date, default: Date.now }
});

// Export the Message model
module.exports = mongoose.model('Message', messageSchema);
