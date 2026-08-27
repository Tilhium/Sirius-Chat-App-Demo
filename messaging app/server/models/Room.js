// Import Mongoose for schema definition
const mongoose = require('mongoose'); 

// Define the Room schema
const roomSchema = new mongoose.Schema({
    // Name of the chat room
    name: { type: String, required: true, unique: true },
    
    // Unique ID of the user who created the room
    creator: { type: String },
    
    // Array of user uniqueIds who are members of this room
    members: [{ type: String }],
    
    // Flag indicating if the room is a private DM or a public/group room
    isPrivate: { type: Boolean, default: false },
    
    // Unique code used for inviting others to the room
    inviteCode: { type: String, unique: true }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt timestamps

// Export the Room model
module.exports = mongoose.model('Room', roomSchema);
