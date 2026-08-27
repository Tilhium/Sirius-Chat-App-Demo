import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Local server URL
const SERVER_URL = 'http://localhost:5000';

function Profile({ user, setUser }) {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [bio, setBio] = useState(user.bio || "");
  const [status, setStatus] = useState("");

  // --- ACTION HANDLERS ---

  // Function to handle saving profile updates to the database
  const handleSave = async () => {
    try {
      const res = await axios.put(`${SERVER_URL}/api/users/update`, {
        uniqueId: user.uniqueId,
        username,
        avatar,
        bio
      });

      // SESSION UPDATE:
      localStorage.setItem('chat_user', JSON.stringify(res.data));
      setUser(res.data);
      
      setStatus("✅ Profile updated successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus("❌ Update failed. Please try again.");
    }
  };

  // Function to securely log the user out of the application
  const logout = () => {
    localStorage.removeItem('chat_user');
    setUser(null);
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Back Navigation Button */}
        <button onClick={() => navigate('/chat')} style={styles.backButton}>
          ← Back to Chats
        </button>

        {/* Profile Header (Avatar and ID Display) */}
        <div style={styles.profileHeader}>
          <img src={avatar} style={styles.largeAvatar} alt="profile" />
          <h2 style={{ margin: '10px 0 0' }}>{user.username}</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>{user.uniqueId}</p>
        </div>

        {/* Profile Editing Form Area */}
        <div style={styles.form}>
          
          <div style={styles.inputGroup}>
            <label>Display Name</label>
            <input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Avatar URL (Image Link)</label>
            <input 
              value={avatar} 
              onChange={(e) => setAvatar(e.target.value)} 
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label>About (Bio)</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              style={{ ...styles.input, height: '80px', resize: 'none' }}
              placeholder="Tell us about yourself..."
            />
          </div>

          {status && <p style={{ color: status.includes('✅') ? '#4CAF50' : '#ff4444' }}>{status}</p>}

          <button onClick={handleSave} style={styles.saveButton}>Save Changes</button>
        </div>

        {/* Visual Divider Line */}
        <hr style={{ border: '0.5px solid #333', margin: '20px 0' }} />

        {/* Danger Zone: Logout */}
        <button onClick={logout} style={styles.logoutButton}>Log Out</button>
      </div>
    </div>
  );
}

// --- STYLES ---
const styles = {
  container: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    background: '#121212', 
    color: 'white' 
  },
  card: { 
    background: '#1e1e1e', 
    padding: '30px', 
    borderRadius: '15px', 
    width: '380px', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
  },
  backButton: { 
    background: 'transparent', 
    border: 'none', 
    color: '#4CAF50', 
    cursor: 'pointer', 
    marginBottom: '20px',
    padding: '0'
  },
  profileHeader: { textAlign: 'center', marginBottom: '20px' },
  largeAvatar: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #4CAF50' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '5px' },
  input: { 
    padding: '10px', 
    background: '#2b2b2b', 
    border: '1px solid #444', 
    borderRadius: '8px', 
    color: 'white' 
  },
  saveButton: { 
    background: '#4CAF50', 
    color: 'white', 
    border: 'none', 
    padding: '12px', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold' 
  },
  logoutButton: { 
    background: '#ff4444', 
    color: 'white', 
    border: 'none', 
    padding: '10px', 
    width: '100%', 
    borderRadius: '8px', 
    cursor: 'pointer' 
  }
};

export default Profile;
