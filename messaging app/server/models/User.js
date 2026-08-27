// Import the Mongoose library to define the schema for MongoDB
const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
    // Display name of the user
    username: { type: String, required: true },
    
    // Unique identifier used for logging in and friend requests
    uniqueId: { type: String, required: true, unique: true },
    
    // Hashed password for security
    password: { type: String, required: true },
    
    // URL pointing to the user's avatar image (default provided)
    avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
    
    // Array of uniqueIds representing the user's accepted friends
    friends: [{ type: String }],
    
    // Array of uniqueIds representing incoming friend requests
    friendRequests: [{ type: String }], 
    
    // Array of room IDs the user has joined or created
    rooms: [{ type: String }],
    
    // Short biography or status message for the user profile
    bio: { type: String },
    
    // --- Brute Force Prevention System Variables ---
    
    // Timestamp indicating when a temporary account lockout expires
    lockoutEndsAt: { type: Date, default: null },
    
    // Multiplier to increase the lockout duration after repeated failed attempts (e.g., 30s, 60s, 90s)
    penaltyMultiplier: { type: Number, default: 1 }
});

// Export the User model to be used in other parts of the application
module.exports = mongoose.model('User', userSchema);
