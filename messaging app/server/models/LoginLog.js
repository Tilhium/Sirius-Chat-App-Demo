// Import Mongoose for schema definition
const mongoose = require('mongoose');

// Define the LoginLog schema for brute force prevention tracking
const loginLogSchema = new mongoose.Schema({
  // Unique ID of the user attempting to log in
  uniqueId: { type: String, required: true },
  
  // Status of the login attempt
  status: { type: String, enum: ['success', 'failed', 'blocked'], required: true },
  
  // IP address of the client (useful for IP-based rate limiting/blocking)
  ipAddress: { type: String }, 
  
  // Timestamp of the login attempt
  createdAt: { type: Date, default: Date.now }
});

// Export the LoginLog model
module.exports = mongoose.model('LoginLog', loginLogSchema);
