import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Local server URL
const SERVER_URL = 'http://localhost:5000';

function Login({ setUser }) {
  // --- STATE MANAGEMENT ---
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0); 
  
  // State to track loading status during API calls
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // --- COUNTDOWN TIMER LOGIC ---
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    } else if (cooldown === 0 && error.includes('Locked')) {
      setError(''); 
    }
    return () => clearInterval(timer);
  }, [cooldown, error]);

  // --- FORM SUBMISSION HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cooldown > 0) return; 

    setError('');
    setIsLoading(true);
    console.log("🚨 Request is on the way...");

    try {
      if (isRegistering) {
        const res = await axios.post(`${SERVER_URL}/api/users/register`, {
          username,
          uniqueId,
          password,
          avatar
        });
        
        console.log("✅ Registration Successful:", res.data);
        localStorage.setItem('chat_user', JSON.stringify(res.data));
        setUser(res.data);
        navigate('/chat');
      } else {
        const res = await axios.post(`${SERVER_URL}/api/users/login`, {
          uniqueId,
          password
        });
        
        console.log("✅ Login Successful:", res.data);
        localStorage.setItem('chat_user', JSON.stringify(res.data));
        setUser(res.data);
        navigate('/chat');
      }
    } catch (err) {
      console.error("❌ Error Caught:", err);
      
      if (err.response?.status === 429) {
        setCooldown(err.response.data.lockoutSeconds);
        setError("System Locked!");
      } else {
        setError(err.response?.data?.error || "Cannot reach the server. Please wait and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      
      <style>
        {`
          @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(3px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(3px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(1px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
          }
          .skull-shake {
            animation: shake 0.5s infinite;
            font-size: 80px;
            margin: 0;
            text-shadow: 0 0 20px #ff0000;
          }
        `}
      </style>

      <div style={styles.card}>
        
        {cooldown > 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p className="skull-shake">💀</p>
            <h2 style={{ color: '#ff4444', marginTop: '20px' }}>ACCESS DENIED</h2>
            <p style={{ color: '#aaa', fontSize: '14px', marginTop: '10px' }}>
              Brute force attack detected.<br/>
              Security protocols engaged.
            </p>
            
            <div style={{ 
              marginTop: '30px', fontSize: '24px', fontWeight: 'bold', color: '#ff4444',
              background: '#2a0000', padding: '15px', borderRadius: '8px', border: '1px solid #ff4444'
            }}>
              00:{cooldown < 10 ? `0${cooldown}` : cooldown}
            </div>
            
            <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
              Wait for the cooldown to lift.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
              {isRegistering ? 'Create a New Account' : 'Log In to Your Account'}
            </h2>
            
            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>
              
              {isRegistering && (
                <input 
                  style={styles.input} 
                  placeholder="Display Name (e.g., John Doe)" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              )}

              <input 
                style={styles.input} 
                placeholder="User ID (e.g., john123)" 
                value={uniqueId} 
                onChange={(e) => setUniqueId(e.target.value)} 
                required 
              />

              <input 
                style={styles.input} 
                type="password" 
                placeholder="Your Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />

              {isRegistering && (
                <input 
                  style={styles.input} 
                  placeholder="Avatar URL (Optional)" 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)} 
                />
              )}

              <button 
                type="submit" 
                style={{
                  ...styles.button, 
                  opacity: isLoading ? 0.6 : 1, 
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }} 
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : (isRegistering ? 'Sign Up' : 'Log In')}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', color: '#888' }}>
              {isRegistering ? 'Already have an account? ' : 'Don\'t have an account yet? '}
              <span 
                style={{...styles.toggleLink, opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'default' : 'pointer'}} 
                onClick={() => {
                  if(!isLoading) {
                    setIsRegistering(!isRegistering);
                    setError('');
                  }
                }}
              >
                {isRegistering ? 'Log In' : 'Sign Up'}
              </span>
            </p>
          </>
        )}
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
    color: '#fff',
    fontFamily: 'Segoe UI, sans-serif'
  },
  card: {
    background: '#1e1e1e',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '400px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#2b2b2b',
    color: 'white',
    outline: 'none',
    fontSize: '15px'
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#4CAF50',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    marginTop: '10px'
  },
  errorBox: {
    background: '#ff444422',
    color: '#ff4444',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '15px',
    textAlign: 'center',
    border: '1px solid #ff4444'
  },
  toggleLink: {
    color: '#4CAF50',
    fontWeight: 'bold',
    textDecoration: 'underline'
  }
};

export default Login;
