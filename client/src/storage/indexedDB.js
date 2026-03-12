const DB_NAME = process.env.REACT_APP_DB_NAME || "chat-app-db";
const DB_VERSION = 1;
const MESSAGES_STORE = "messages";

let db = null;

// Reset the cached db connection (call this on logout/login)
export const resetDB = () => {
  if (db) {
    try { db.close(); } catch (_) {}
    db = null;
  }
};

export const openDB = () => {
  return new Promise((resolve, reject) => {
    // If we have a valid open connection, reuse it
    if (db) {
      // Check if connection is still open
      try {
        // Accessing objectStoreNames throws if connection is closed
        void db.objectStoreNames;
        return resolve(db);
      } catch (_) {
        db = null; // Reset stale connection
      }
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = database.createObjectStore(MESSAGES_STORE, { keyPath: "id" });
        store.createIndex("conversationId", "conversationId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      // Reset cache if browser closes the connection unexpectedly
      db.onclose = () => { db = null; };
      db.onerror = () => { db = null; };
      resolve(db);
    };

    request.onerror = () => {
      db = null;
      reject(request.error);
    };

    request.onblocked = () => {
      db = null;
      reject(new Error("IndexedDB blocked"));
    };
  });
};

// Sanitize message before saving to IndexedDB
// Removes any non-cloneable values that cause "Internal error" on some browsers
const sanitizeMessage = (message) => {
  return {
    id: String(message.id || ""),
    senderId: String(message.senderId || ""),
    conversationId: String(message.conversationId || ""),
    text: String(message.text || ""),
    fileUrl: String(message.fileUrl || ""),
    fileName: String(message.fileName || ""),
    messageType: String(message.messageType || "text"),
    timestamp: Number(message.timestamp || Date.now()),
    seenBy: Array.isArray(message.seenBy) ? message.seenBy.map(String) : [],
    replyTo: message.replyTo
      ? {
          id: String(message.replyTo.id || ""),
          text: String(message.replyTo.text || ""),
          senderName: String(message.replyTo.senderName || ""),
          messageType: String(message.replyTo.messageType || "text"),
          fileName: String(message.replyTo.fileName || ""),
        }
      : null,
  };
};

export const saveMessage = async (message) => {
  try {
    const database = await openDB();
    const clean = sanitizeMessage(message);
    return new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      const req = store.put(clean);
      req.onsuccess = () => resolve(clean);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("saveMessage failed:", err);
    return message; // Return message anyway so UI still updates
  }
};

export const saveMessages = async (messages) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      messages.forEach((msg) => store.put(sanitizeMessage(msg)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("saveMessages failed:", err);
  }
};

export const getMessagesByConversation = async (conversationId) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readonly");
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index("conversationId");
      const req = index.getAll(conversationId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("getMessagesByConversation failed:", err);
    return [];
  }
};

export const deleteConversationMessages = async (conversationId) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index("conversationId");
      const req = index.openCursor(conversationId);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("deleteConversationMessages failed:", err);
  }
};

export const updateMessageSeenStatus = async (messageIds, userId) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      messageIds.forEach((id) => {
        const req = store.get(id);
        req.onsuccess = () => {
          const msg = req.result;
          if (msg && !msg.seenBy?.includes(userId)) {
            msg.seenBy = [...(msg.seenBy || []), String(userId)];
            store.put(msg);
          }
        };
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("updateMessageSeenStatus failed:", err);
  }
};

export const clearAllMessages = async () => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("clearAllMessages failed:", err);
  }
};