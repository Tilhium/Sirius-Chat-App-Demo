import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Profile from './pages/Profile';

function App() {
  // SAFE DATA FETCHING: Defined as a function to prevent JSON parsing errors on initial load
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('chat_user');
    try {
      // If data exists, parse it as JSON; if missing or corrupted, return null
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("LocalStorage data is corrupted, clearing...");
      localStorage.removeItem('chat_user'); // Delete corrupted data from memory
      return null;
    }
  });

  return (
    <Router>
      <Routes>
        {/* If user is not logged in, redirect to Login; otherwise redirect to Chat */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/chat" /> : <Login setUser={setUser} />} 
        />
        <Route 
          path="/chat" 
          element={user ? <Chat user={user} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/profile" 
          element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/" />} 
        />
        {/* If a route is not defined, fallback and redirect to the home page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
