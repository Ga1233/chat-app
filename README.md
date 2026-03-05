# 💬 Nexus — Real-Time Chat App

A full-stack real-time chat app built with **MERN + Socket.io**. All communication happens over WebSockets. Messages are stored locally on the device using **IndexedDB**, keeping MongoDB lean.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure Environment

**server/.env**
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chatapp
JWT_SECRET=your_secret_key_here
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=5242880
```

**client/.env**
```
REACT_APP_SERVER_URL=http://localhost:5000
REACT_APP_DB_NAME=chat-app-db
```

### 3. Run

```bash
# Terminal 1 — Server
cd server && npm run dev

# Terminal 2 — Client
cd client && npm start
```

App runs at `http://localhost:3000`

---

## 🏗️ Architecture

```
chat-app/
├── server/
│   ├── models/          # Mongoose models (User, Conversation)
│   ├── socket/          # Socket event handlers
│   │   ├── authSocket.js
│   │   ├── chatSocket.js
│   │   └── groupSocket.js
│   ├── middleware/      # Auth & file upload middleware
│   ├── uploads/         # Uploaded files (gitignored)
│   └── server.js
│
└── client/
    └── src/
        ├── components/
        │   ├── auth/    # (reserved for future auth components)
        │   ├── chat/    # Sidebar, ChatWindow, MessageBubble, CreateGroup, GroupInfo
        │   └── common/  # Avatar
        ├── context/     # AuthContext, ChatContext
        ├── pages/       # AuthPage, ChatPage
        ├── socket/      # Socket.io client setup
        ├── storage/     # IndexedDB helper
        └── styles/      # Global CSS
```

## ✨ Features

- JWT authentication via sockets
- One-to-one and group chat
- File/image sharing (5MB limit)
- Typing indicators
- Seen message receipts
- Online/offline status
- Local message storage (IndexedDB)
- Delete chat locally
- Mobile-first responsive design

## 🌍 Deploy

- **Frontend**: Vercel (`client/`)
- **Backend**: Render or Railway (`server/`)
- **Database**: MongoDB Atlas

Update `REACT_APP_SERVER_URL` and `CLIENT_URL` for production.
