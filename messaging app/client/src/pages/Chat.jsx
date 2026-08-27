import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';

// SERVER AND SECURITY SETTINGS - LOCAL DEVELOPMENT
const SERVER_URL = 'http://localhost:5000';
const socket = io(SERVER_URL); 
const SECRET_KEY = "siriuschatapp_secure_chat_key"; 

// CLOUDINARY SETTINGS FOR MEDIA UPLOADS
const CLOUD_NAME = "dobjwt2sj";
const UPLOAD_PRESET = "ka7hwvbl";

function Chat({ user }) {
  // --- THEME MANAGEMENT (Integrated with Local Storage) ---
  const [theme, setTheme] = useState(() => localStorage.getItem('chat_theme') || 'dark');
  
  useEffect(() => {
    localStorage.setItem('chat_theme', theme);
  }, [theme]);

  // Dynamic Theme Color Palette
  const th = {
    bg: theme === 'dark' ? '#222' : '#fff',
    border: theme === 'dark' ? '#444' : '#d1d7db',
    text: theme === 'dark' ? 'white' : '#111b21',
    textMuted: theme === 'dark' ? '#aaa' : '#667781',
    dropBg: theme === 'dark' ? '#333' : '#fff',
    fileBg: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
    btnBg: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f2f5'
  };

  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState([]); 
  const [pendingMessages, setPendingMessages] = useState([]); 
  const [message, setMessage] = useState(''); 
  const [isUploading, setIsUploading] = useState(false); 
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [rooms, setRooms] = useState([]); 
  const [friends, setFriends] = useState([]); 
  const [friendRequests, setFriendRequests] = useState([]); 
  
  const [currentRoom, setCurrentRoom] = useState(null); 
  const [showModal, setShowModal] = useState(false); 
  const [modalType, setModalType] = useState(''); 
  const [inputValue, setInputValue] = useState(''); 
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  const [activeMenuId, setActiveMenuId] = useState(null); 
  const [editingMessageId, setEditingMessageId] = useState(null); 
  const [editInputValue, setEditInputValue] = useState(''); 

  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [activeContactMenu, setActiveContactMenu] = useState(null);
  
  // UNREAD MESSAGE COUNTERS
  const [unreadCounts, setUnreadCounts] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const navigate = useNavigate();

  // --- HELPER FUNCTIONS ---

  const decryptMessage = (encryptedText) => {
    try {
      if (!encryptedText) return "";
      const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      return originalText || encryptedText; 
    } catch (error) {
      return encryptedText; 
    }
  };

  const getRoomMedia = () => {
    const mediaFiles = [];
    messages.forEach(m => {
      if (m.deletedFor?.includes(user.uniqueId) || m.deletedForEveryone) return;

      const rawText = decryptMessage(m.content || m.text);
      if (rawText && rawText.includes('res.cloudinary.com')) {
        const url = rawText.includes('|-CAPTION-|') ? rawText.split('|-CAPTION-|')[0] : rawText;
        const lowerUrl = url.toLowerCase();

        let type = 'image';
        if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/i) || lowerUrl.includes('/video/upload/')) {
          type = 'video';
        } else if (lowerUrl.match(/\.(pdf|doc|docx|zip|rar|txt)$/i)) {
          type = 'document';
        }

        mediaFiles.push({ url, type, date: m.createdAt, sender: m.sender });
      }
    });
    return mediaFiles.reverse(); 
  };

  const renderMessageContent = (rawText) => {
    if (!rawText) return null;

    let textToParse = rawText;
    let caption = "";

    if (rawText.includes('|-CAPTION-|')) {
      const parts = rawText.split('|-CAPTION-|');
      textToParse = parts[0]; 
      caption = parts[1];     
    }

    let mediaElement = null;

    if (textToParse.startsWith('http') && textToParse.includes('res.cloudinary.com')) {
      const lowerText = textToParse.toLowerCase();

      if (lowerText.match(/\.(mp4|webm|ogg|mov)$/i) || textToParse.includes('/video/upload/')) {
        mediaElement = <video src={textToParse} controls style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '250px', outline: 'none' }} />;
      } 
      else {
        const isImage = lowerText.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        const isDocument = lowerText.match(/\.(pdf|doc|docx|zip|rar|txt)$/i);

        if (isImage && !isDocument) {
          mediaElement = <img src={textToParse} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '250px', objectFit: 'contain', cursor: 'pointer' }} onClick={() => window.open(textToParse, '_blank')} />;
        } 
        else {
          let icon = '📁';
          let label = 'File Attachment';

          if (lowerText.endsWith('.pdf')) { icon = '📄'; label = 'PDF Document'; } 
          else if (lowerText.match(/\.(doc|docx)$/i)) { icon = '📝'; label = 'Word Document'; } 
          else if (lowerText.match(/\.(zip|rar)$/i)) { icon = '📦'; label = 'Archive File'; }

          const downloadUrl = textToParse.replace('/upload/', '/upload/fl_attachment/');

          mediaElement = (
            <div className="file-attachment-box" style={{ 
              display: 'flex', flexDirection: 'column', gap: '10px', 
              background: th.fileBg, padding: '12px', borderRadius: '8px', 
              border: `1px solid ${th.border}`, minWidth: '220px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>{icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: th.text }}>{label}</span>
                  <span style={{ fontSize: '11px', color: th.textMuted }}>Secure Attachment</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '5px', borderTop: `1px solid ${th.border}`, paddingTop: '10px' }}>
                <button onClick={(e) => { e.stopPropagation(); window.open(textToParse, '_blank'); }} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 'bold', background: theme === 'dark' ? '#444' : '#e9edef', color: th.text, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>👁️ Open</button>
                <button onClick={(e) => { e.stopPropagation(); window.open(downloadUrl, '_self'); }} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 'bold', background: '#00a884', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>⬇️ Save</button>
              </div>
            </div>
          );
        }
      }
    } else {
      mediaElement = <div style={{ wordBreak: 'break-word', color: 'inherit' }}>{textToParse}</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mediaElement}
        {caption && (
          <div className="message-caption" style={{ fontSize: '14px', wordBreak: 'break-word', paddingTop: mediaElement ? '4px' : '0', color: 'inherit' }}>
            {caption}
          </div>
        )}
      </div>
    );
  };

  // --- DATA FETCHING AND SOCKET.IO ---
  const fetchData = async () => {
    try {
      const [roomsRes, friendsRes, requestsRes] = await Promise.all([
        axios.get(`${SERVER_URL}/api/rooms/${user.uniqueId}`),
        axios.get(`${SERVER_URL}/api/users/friends/${user.uniqueId}`),
        axios.get(`${SERVER_URL}/api/users/requests/${user.uniqueId}`)
      ]);

      setRooms(roomsRes.data);
      setFriends(friendsRes.data);
      setFriendRequests(requestsRes.data);

      if (roomsRes.data.length > 0 && !currentRoom) {
        handleRoomSelect(roomsRes.data[0]);
      }
    } catch (error) {
      console.error("Failed to load initial data", error);
    }
  };

  const handleRoomSelect = (roomObject) => {
    setCurrentRoom(roomObject);
    setIsSidebarOpen(false); 
    setPendingMessages([]); 
    socket.emit('join_room', roomObject.name);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchData();
  }, [user.uniqueId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingMessages]);

  useEffect(() => {
    socket.on('message_history', (historyData) => setMessages(historyData));

    socket.on('receive_message', (data) => {
      if (currentRoom && data.room === currentRoom.name) {
        if (data.senderId === user.uniqueId) {
          setPendingMessages(prev => prev.filter(p => p.encryptedText !== data.text));
        }
        setMessages((prev) => [...prev, data]);
        socket.emit('mark_read', { roomId: currentRoom.name, userId: user.uniqueId });
      } else {
        // IF A MESSAGE ARRIVES WHILE IN ANOTHER ROOM: Increment notification count and move user to the top
        setUnreadCounts(prev => ({
          ...prev,
          [data.room]: (prev[data.room] || 0) + 1
        }));

        setFriends(prevFriends => {
          const senderIndex = prevFriends.findIndex(f => f.uniqueId === data.senderId);
          if (senderIndex > -1) {
            const newFriends = [...prevFriends];
            const [sender] = newFriends.splice(senderIndex, 1);
            return [sender, ...newFriends];
          }
          return prevFriends;
        });
      }
    });

    socket.on('messages_marked_read', ({ roomId, userId }) => {
      if (currentRoom && currentRoom.name === roomId) {
        setMessages((prev) => prev.map(m => {
          if (!m.readBy) m.readBy = [];
          if (!m.readBy.includes(userId)) return { ...m, readBy: [...m.readBy, userId] };
          return m;
        }));
      }
    });

    socket.on('message_edited', ({ messageId, newText }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content: newText, isEdited: true } : m));
    });

    socket.on('message_deleted', ({ messageId, type, userId }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          if (type === 'everyone') return { ...m, deletedForEveryone: true };
          if (type === 'me') return { ...m, deletedFor: [...(m.deletedFor || []), userId] };
        }
        return m;
      }));
    });

    socket.on('friend_data_updated', ({ targetId }) => {
        if (targetId === user.uniqueId) fetchData(); 
    });

    socket.on('chat_cleared', ({ roomId, userId }) => {
      if (user.uniqueId === userId) {
        setMessages(prev => prev.map(m => {
          if (m.room === roomId || (m.room === undefined && currentRoom?.name === roomId)) {
            return { ...m, deletedFor: [...(m.deletedFor || []), userId] };
          }
          return m;
        }));
      }
    });

    if (currentRoom) {
       socket.emit('mark_read', { roomId: currentRoom.name, userId: user.uniqueId });
    }

    return () => {
      socket.off('message_history');
      socket.off('receive_message');
      socket.off('messages_marked_read');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('friend_data_updated');
      socket.off('chat_cleared'); 
    };
  }, [currentRoom, user.uniqueId]);

  // --- USER ACTIONS ---

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
    e.target.value = null; 
  };

  const startPrivateChat = (friend) => {
    const dmRoomName = [user.uniqueId, friend.uniqueId].sort().join('_');
    handleRoomSelect({ name: dmRoomName, displayName: friend.username, isDM: true });
    setIsStartMenuOpen(false); 
    
    // Reset notifications upon entering the room
    setUnreadCounts(prev => ({ ...prev, [dmRoomName]: 0 }));
  };

  const clearChat = (friend) => {
    const isConfirmed = window.confirm(`Are you sure you want to clear your chat history with ${friend.username}?`);
    if (isConfirmed) {
      const dmRoomName = [user.uniqueId, friend.uniqueId].sort().join('_');
      socket.emit('clear_chat', { roomId: dmRoomName, userId: user.uniqueId });
    }
    setActiveContactMenu(null);
  };

  const handleModalSubmit = async () => {
    try {
      if (modalType === 'create') {
        await axios.post(`${SERVER_URL}/api/rooms`, { name: inputValue, creator: user.uniqueId });
      } else if (modalType === 'join') {
        await axios.post(`${SERVER_URL}/api/rooms/join`, { userId: user.uniqueId, inviteCode: inputValue });
      } else if (modalType === 'addFriend') {
        if (!inputValue.startsWith('@')) return alert("ID must start with '@' (e.g., @user123)");
        const res = await axios.post(`${SERVER_URL}/api/users/send-request`, { myId: user.uniqueId, friendUniqueId: inputValue });
        alert(res.data.message); 
      }
      setInputValue('');
      setShowModal(false);
      fetchData(); 
    } catch (error) {
      alert(error.response?.data?.error || "An error occurred");
    }
  };

  const handleRequestResponse = async (senderId, action) => {
    try {
      await axios.post(`${SERVER_URL}/api/users/respond-request`, { myId: user.uniqueId, senderId, action });
      fetchData(); 
    } catch (error) {
      alert("Error processing request.");
    }
  };

  const sendMessage = async () => {
    if (!message.trim() && !selectedFile) return;
    if (!currentRoom) return;

    let finalMessageRaw = message.trim();
    const tempId = Date.now(); 

    if (selectedFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', UPLOAD_PRESET);

      try {
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, formData);
        const fileUrl = res.data.secure_url; 
        finalMessageRaw = message.trim() ? `${fileUrl}|-CAPTION-|${message.trim()}` : fileUrl;
      } catch (error) {
        alert("Failed to upload file. Size limit exceeded or network error.");
        setIsUploading(false);
        return; 
      }
    }

    const encryptedMessage = CryptoJS.AES.encrypt(finalMessageRaw, SECRET_KEY).toString();

    setPendingMessages(prev => [...prev, {
      _id: tempId, text: finalMessageRaw, encryptedText: encryptedMessage, status: 'sending', createdAt: new Date()
    }]);

    socket.emit('send_message', {
      sender: user.username, senderId: user.uniqueId, text: encryptedMessage, room: currentRoom.name, createdAt: new Date()
    });

    setMessage(''); 
    setSelectedFile(null); 
    setIsUploading(false);

    setTimeout(() => {
      setPendingMessages(prev => prev.map(p => 
        p._id === tempId && p.status === 'sending' ? { ...p, status: 'failed' } : p
      ));
    }, 5000);
  };

  const handleDelete = (messageId, type) => {
    socket.emit('delete_message', { messageId, roomId: currentRoom.name, userId: user.uniqueId, type });
    setActiveMenuId(null); 
  };

  const startEditing = (m) => {
    setEditingMessageId(m._id);
    setEditInputValue(decryptMessage(m.content || m.text).split('|-CAPTION-|')[0]); 
    setActiveMenuId(null);
  };

  const submitEdit = () => {
    if (editInputValue.trim()) {
      const encryptedText = CryptoJS.AES.encrypt(editInputValue, SECRET_KEY).toString();
      socket.emit('edit_message', { messageId: editingMessageId, newText: encryptedText, roomId: currentRoom.name });
    }
    setEditingMessageId(null); 
  };

  const getAvatarById = (id) => {
    const friend = friends.find(f => f.uniqueId === id);
    return friend ? friend.avatar : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; 
  };

  const dropdownBtnStyle = { 
    background: 'transparent', border: 'none', color: th.text, 
    textAlign: 'left', padding: '8px', cursor: 'pointer', 
    fontSize: '12px', borderBottom: `1px solid ${th.border}` 
  };

  // --- RENDER SECTION ---
  return (
    <div className={`app-container ${theme}`} onClick={() => { setActiveMenuId(null); setActiveContactMenu(null); }}>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-mobile-header">
           <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <div className="profile-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
            <img src={user.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="profile" />
            <div className="profile-info">
              <div style={{ fontWeight: 'bold' }}>{user.username}</div>
              <div style={{ fontSize: '10px', color: th.textMuted }}>{user.uniqueId}</div>
            </div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '22px' }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="start-message-container">
          <button className="start-btn" onClick={(e) => { e.stopPropagation(); setIsStartMenuOpen(!isStartMenuOpen); }}>💬 Start Chat</button>
          {isStartMenuOpen && (
            <div className="start-dropdown" style={{ background: th.dropBg, border: `1px solid ${th.border}` }}>
              <div className="dropdown-item create-group" onClick={() => { setModalType('create'); setShowModal(true); setIsStartMenuOpen(false); }}>➕ Create New Group</div>
              <div className="dropdown-item create-group" onClick={() => { setModalType('join'); setShowModal(true); setIsStartMenuOpen(false); }}>🔑 Join Group via Code</div>
              <div className="dropdown-divider" style={{ borderTop: `1px solid ${th.border}` }}>Your Friends</div>
              {friends.length > 0 ? friends.map(f => (
                <div key={f.uniqueId} className="dropdown-item" onClick={() => startPrivateChat(f)}>
                  <img src={f.avatar} alt="avatar" /> {f.username}
                </div>
              )) : <div className="dropdown-empty" style={{ color: th.textMuted }}>No friends yet.</div>}
            </div>
          )}
        </div>

        <div className="section-header">
          <h3>Rooms</h3>
          <span className="add-friend-icon" onClick={() => {setModalType('addFriend'); setShowModal(true);}} title="Add Friend">👤+</span>
        </div>
        
        <div className="list-container">
          {rooms.map(room => (
            <div key={room._id} className={`room-item ${currentRoom?.name === room.name ? 'active' : ''}`} onClick={() => handleRoomSelect(room)}>
              # {room.name}
            </div>
          ))}
        </div>

        <div className="section-header" style={{ marginTop: '20px' }}>
          <h3>Requests {friendRequests.length > 0 && <span style={{ color: '#ffeb3b' }}>({friendRequests.length})</span>}</h3>
        </div>
        <div className="list-container">
          {friendRequests.length === 0 ? (
             <div style={{ padding: '0 10px', fontSize: '12px', color: th.textMuted, fontStyle: 'italic' }}>No pending requests.</div>
          ) : (
            friendRequests.map(req => (
              <div key={req.uniqueId} className="friend-item" style={{ display: 'flex', justifyContent: 'space-between', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={req.avatar} className="friend-avatar" alt="requester" />
                  <span>{req.username}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleRequestResponse(req.uniqueId, 'accept'); }} style={{ background: '#4CAF50', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', padding: '4px 8px' }}>✓</button>
                  <button onClick={(e) => { e.stopPropagation(); handleRequestResponse(req.uniqueId, 'reject'); }} style={{ background: '#f44336', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', padding: '4px 8px' }}>✗</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="section-header" style={{ marginTop: '20px' }}>
          <h3>Contacts</h3>
        </div>
        <div className="list-container">
           {friends.length === 0 ? (
             <div style={{ padding: '0 10px', fontSize: '12px', color: th.textMuted, fontStyle: 'italic' }}>No contacts yet.</div>
           ) : (
             friends.map(friend => {
               const dmRoomName = [user.uniqueId, friend.uniqueId].sort().join('_');
               const unreadCount = unreadCounts[dmRoomName] || 0;

               return (
                <div key={friend.uniqueId} className={`friend-item ${currentRoom?.name.includes(friend.uniqueId) ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }} onClick={() => startPrivateChat(friend)}>
                    <img src={friend.avatar} className="friend-avatar" alt="friend" />
                    
                    <span style={{ fontWeight: unreadCount > 0 ? 'bold' : 'normal', color: th.text }}>
                      {friend.username}
                    </span>
                    
                    {unreadCount > 0 && (
                      <span style={{ background: '#25D366', color: 'white', borderRadius: '50px', padding: '2px 7px', fontSize: '11px', fontWeight: 'bold', marginLeft: 'auto', marginRight: '10px' }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <span onClick={(e) => { e.stopPropagation(); setActiveContactMenu(activeContactMenu === friend.uniqueId ? null : friend.uniqueId); }} style={{ padding: '0 8px', cursor: 'pointer', opacity: 0.7, fontSize: '18px', color: th.text }}>⋮</span>
                    {activeContactMenu === friend.uniqueId && (
                      <div className="msg-dropdown" style={{ position: 'absolute', top: '100%', right: '0', background: th.dropBg, border: `1px solid ${th.border}`, borderRadius: '8px', zIndex: 20, padding: '5px', display: 'flex', flexDirection: 'column', minWidth: '130px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <button onClick={(e) => { e.stopPropagation(); clearChat(friend); }} style={{ ...dropdownBtnStyle, borderBottom: 'none', color: '#ff6b6b' }}>🧹 Clear Chat</button>
                      </div>
                    )}
                  </div>
                </div>
               );
             })
           )}
        </div>
      </div>

      <div className="chat-area">
        {currentRoom ? (
          <>
            <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="hamburger-btn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }} style={{ color: th.text }}>☰</button>
                <h3 style={{ color: th.text }}>{currentRoom.isDM ? `@ ${currentRoom.displayName}` : `# ${currentRoom.name}`}</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {!currentRoom.isDM && <div className="room-info" style={{ color: th.text }}><span>Code: <strong>{currentRoom.inviteCode}</strong></span></div>}
                <button 
                  onClick={() => setShowMediaGallery(true)}
                  style={{ background: th.btnBg, border: 'none', color: th.text, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}
                >
                  🖼️ Media
                </button>
              </div>
            </div>
            
            <div className="messages">
              {messages.map((m, i) => {
                if (m.deletedFor?.includes(user.uniqueId)) return null;
                const isMe = m.senderId === user.uniqueId;

                return (
                  <div key={m._id || i} className={`message-wrapper ${isMe ? 'me' : 'other'}`}>
                    <div className="message-content" style={{ position: 'relative' }}>
                      {!isMe && <small style={{ color: theme === 'light' ? '#000' : '#ddd' }}>{m.sender}</small>}
                      
                      {m.deletedForEveryone ? (
                        <div style={{ fontStyle: 'italic', opacity: 0.7 }}>🚫 This message was deleted</div>
                      ) : (
                        <>
                          {editingMessageId === m._id ? (
                            <div className="edit-mode">
                              <input autoFocus value={editInputValue} onChange={(e) => setEditInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitEdit()} style={{ width: '100%', padding: '5px', borderRadius: '4px', border: `1px solid ${th.border}`, color: '#000' }} />
                              <div style={{ marginTop: '5px', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingMessageId(null)} style={{ padding: '3px 8px', fontSize: '12px' }}>Cancel</button>
                                <button onClick={submitEdit} style={{ padding: '3px 8px', fontSize: '12px', background: '#4CAF50', color: 'white' }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              {renderMessageContent(decryptMessage(m.content || m.text))}
                              <span onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === m._id ? null : m._id); }} style={{ cursor: 'pointer', opacity: 0.7, userSelect: 'none', padding: '0 5px' }}>⋮</span>
                            </div>
                          )}

                          {activeMenuId === m._id && (
                            <div className="msg-dropdown" style={{ position: 'absolute', top: '100%', right: '0', background: th.dropBg, border: `1px solid ${th.border}`, borderRadius: '8px', zIndex: 10, padding: '5px', display: 'flex', flexDirection: 'column', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                              {isMe && <button onClick={() => startEditing(m)} style={dropdownBtnStyle}>✏️ Edit</button>}
                              {isMe && <button onClick={() => handleDelete(m._id, 'everyone')} style={dropdownBtnStyle}>🗑️ Delete for everyone</button>}
                              <button onClick={() => handleDelete(m._id, 'me')} style={dropdownBtnStyle}>👀 Delete for me</button>
                            </div>
                          )}
                          
                          <small className="time" style={{ color: theme === 'light' ? '#666' : '#aaa' }}>
                            {new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            {m.isEdited && <span style={{ fontStyle: 'italic', marginLeft: '5px' }}>(edited)</span>}
                          </small>
                          
                          {isMe && (
                            <div className="read-receipts" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', gap: '2px' }}>
                              {currentRoom.isDM ? (
                                m.readBy && m.readBy.length > 1 ? (
                                  m.readBy.filter(id => id !== user.uniqueId).map(id => (<img key={id} src={getAvatarById(id)} className="seen-avatar" style={{ width: '16px', height: '16px', borderRadius: '50%' }} title="Read" alt="seen" />))
                                ) : (<span style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '14px', fontWeight: 'bold' }} title="Sent">✓</span>)
                              ) : (
                                m.readBy && currentRoom.members && m.readBy.length >= currentRoom.members.length ? (
                                  <span style={{ color: '#4CAF50', fontSize: '14px', fontWeight: 'bold' }} title="Read by everyone">✓✓</span>
                                ) : (<span style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '14px', fontWeight: 'bold' }} title="Sent">✓</span>)
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {pendingMessages.map((p) => (
                <div key={p._id} className="message-wrapper me">
                  <div className="message-content" style={{ position: 'relative', opacity: p.status === 'failed' ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      {renderMessageContent(p.text)}
                    </div>
                    <small className="time" style={{ color: theme === 'light' ? '#666' : '#aaa' }}>{new Date(p.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
                    <div className="read-receipts" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      {p.status === 'sending' ? (<span title="Sending..." style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '14px' }}>⏳</span>) : (<span title="Failed to send" style={{ color: '#f44336', fontSize: '14px', fontWeight: 'bold' }}>❗</span>)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area-container" style={{ display: 'flex', flexDirection: 'column', background: 'transparent' }}>
              {selectedFile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 15px', background: th.fileBg, borderRadius: '8px 8px 0 0', margin: '0 20px', borderBottom: `1px solid ${th.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '20px' }}>📎</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: th.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                      {selectedFile.name}
                    </span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', fontWeight: 'bold' }}>✕</button>
                </div>
              )}

              <div className="input-area" style={{ borderRadius: selectedFile ? '0 0 8px 8px' : '8px', borderTopLeftRadius: selectedFile ? '0' : '8px', borderTopRightRadius: selectedFile ? '0' : '8px' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,video/*,application/pdf,.doc,.docx,.zip,.rar" />
                <button onClick={() => fileInputRef.current.click()} disabled={isUploading} style={{ background: 'transparent', border: 'none', color: th.text, fontSize: '20px', cursor: isUploading ? 'not-allowed' : 'pointer', padding: '0 10px' }} title="Attach Files">
                  {isUploading ? '⏳' : '📎'}
                </button>

                <input value={message} onChange={(e)=>setMessage(e.target.value)} onKeyPress={(e)=>e.key==='Enter' && sendMessage()} placeholder={selectedFile ? "Add a caption..." : "Type a message..."} disabled={isUploading} style={{ background: th.bg, color: th.text, border: `1px solid ${th.border}` }} />
                <button onClick={sendMessage} disabled={isUploading}>{isUploading ? '⏳' : 'Send'}</button>
              </div>
            </div>
          </>
        ) : (
          <div className="welcome-screen" style={{ color: th.text }}>
             <button className="hamburger-btn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }} style={{ position: 'absolute', top: '20px', left: '20px', color: th.text }}>☰</button>
             Select a room or contact to start chatting.
          </div>
        )}
      </div>

      {showMediaGallery && (
        <div className="modal-overlay" onClick={() => setShowMediaGallery(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', background: th.bg, border: `1px solid ${th.border}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${th.border}`, paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: th.text }}>🖼️ Shared Media</h3>
              <button onClick={() => setShowMediaGallery(false)} style={{ background: 'transparent', border: 'none', color: th.textMuted, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' }}>
              {getRoomMedia().length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: th.textMuted, padding: '40px 0' }}>No media has been shared in this chat yet.</div>
              ) : (
                getRoomMedia().map((media, index) => (
                  <div key={index} onClick={() => window.open(media.url, '_blank')} style={{ background: th.dropBg, borderRadius: '8px', overflow: 'hidden', height: '120px', cursor: 'pointer', position: 'relative', border: `1px solid ${th.border}` }}>
                    {media.type === 'image' && <img src={media.url} alt="shared" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {media.type === 'video' && <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {media.type === 'document' && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '40px', background: th.dropBg }}>📄</div>}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '4px', fontSize: '10px', color: '#ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span>{media.type === 'video' ? '🎥' : media.type === 'document' ? '📁' : '📷'}</span>
                       <span style={{ fontSize: '9px', opacity: 0.8 }}>{new Date(media.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ background: th.bg, border: `1px solid ${th.border}`, color: th.text }}>
            <h4>{modalType === 'create' ? 'Create New Room' : modalType === 'join' ? 'Join via Code' : 'Add Friend'}</h4>
            <input placeholder={modalType === 'addFriend' ? 'Enter @ID... (e.g. @john)' : 'Enter Name or Code...'} value={inputValue} onChange={(e) => setInputValue(e.target.value)} style={{ background: th.dropBg, color: th.text, border: `1px solid ${th.border}` }} />
            <div className="modal-buttons">
              <button onClick={() => setShowModal(false)} style={{ color: th.text }}>Cancel</button>
              <button className="confirm" onClick={handleModalSubmit}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
