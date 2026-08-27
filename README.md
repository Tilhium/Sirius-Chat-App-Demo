# 💬 Real-Time Messaging App

A full-stack real-time messaging application built with React, Node.js, Socket.io, and MongoDB. Features include private DMs, group rooms, file sharing, message encryption, brute-force protection, and more.

---

## ✨ Features

- 🔐 **User Authentication** — Register & login with hashed passwords (bcrypt)
- 🛡️ **Brute Force Protection** — Automatic account lockout with escalating penalties after repeated failed login attempts
- 💬 **Real-Time Messaging** — Instant bi-directional communication via Socket.io
- 🔒 **End-to-End Message Encryption** — All messages encrypted client-side with AES (CryptoJS) before sending
- 👥 **Group Rooms** — Create or join rooms using invite codes
- 🤝 **Friend System** — Send/accept/reject friend requests, start private DMs
- 📎 **File & Media Sharing** — Upload images, videos, and documents via Cloudinary
- 🖼️ **Media Gallery** — View all shared media in a room at a glance
- ✅ **Read Receipts** — See who has read your messages
- ✏️ **Edit & Delete Messages** — Edit or delete messages (for yourself or everyone)
- 🧹 **Clear Chat** — Clear your own chat history with any contact
- 🌙 **Dark / Light Theme** — Toggle between themes, persisted via localStorage
- 📱 **Responsive Design** — Mobile-friendly sidebar with hamburger navigation

---

## 🛠️ Tech Stack

### Frontend (Client)
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Lightning-fast build tool & dev server |
| **React Router DOM** | Client-side routing |
| **Socket.io-client** | Real-time WebSocket communication |
| **Axios** | HTTP requests |
| **CryptoJS** | AES message encryption/decryption |
| **Lucide React** | Icon library |
| **Cloudinary** | File & media uploads (images, videos, documents) |

### Backend (Server)
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **Socket.io** | Real-time event handling |
| **MongoDB + Mongoose** | Database & ODM |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT (dependency available) |
| **dotenv** | Environment variable management |
| **cors** | Cross-origin resource sharing |
| **nodemon** | Dev auto-restart |

---

## 📁 Project Structure

```
messaging app/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx    # Register / Login page
│   │   │   ├── Chat.jsx     # Main chat UI
│   │   │   └── Profile.jsx  # User profile editor
│   │   ├── App.jsx          # Route definitions
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   └── vite.config.js
│
└── server/                  # Node.js + Express backend
    ├── models/
    │   ├── User.js          # User schema (with lockout fields)
    │   ├── Message.js       # Message schema
    │   ├── Room.js          # Room schema
    │   └── LoginLog.js      # Brute-force login log schema
    ├── index.js             # Main server (REST API + Socket.io)
    ├── .env.example         # Environment variable template
    └── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) — local instance or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- A [Cloudinary](https://cloudinary.com/) account for file uploads (free tier available)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/messaging-app.git
cd messaging-app
```

---

### 2. Set Up the Server

```bash
cd server
npm install
```

Create your `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/chatdb
JWT_SECRET=your_own_super_secret_key
```

Start the server:

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server will run on `http://localhost:5000`

---

### 3. Set Up the Client

```bash
cd ../client
npm install
```

> **Cloudinary Setup (for file uploads):**
> 
> Open `src/pages/Chat.jsx` and replace the Cloudinary credentials at the top with your own:
> 
> ```js
> const CLOUD_NAME = "your_cloudinary_cloud_name";
> const UPLOAD_PRESET = "your_unsigned_upload_preset";
> ```
> 
> You can create an **unsigned upload preset** in your Cloudinary dashboard under Settings → Upload.

Start the development server:

```bash
npm run dev
```

The client will run on `http://localhost:5173`

---

### 4. Open the App

Navigate to `http://localhost:5173` in your browser. Register a new account and start chatting!

---

## ⚙️ Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the server listens on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT signing | `any_long_random_string` |

---

## 🔒 Security Notes

- Passwords are **never stored in plain text** — bcrypt with salt rounds is used
- Messages are **encrypted client-side** with AES before being sent to the server
- The `.env` file is included in `.gitignore` and **will not be committed**
- Brute-force protection automatically locks accounts after repeated failed login attempts with an escalating timeout (30s → 60s → 90s...)
- **Important:** The `SECRET_KEY` used for message encryption in `Chat.jsx` is currently hardcoded. For production, move it to a more secure configuration

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📝 License

[MIT](https://choosealicense.com/licenses/mit/)
