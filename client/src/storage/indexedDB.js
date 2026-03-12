// Each user gets their own IndexedDB database (chat-app-db-{userId})
// This completely prevents cross-session corruption.

const MESSAGES_STORE = "messages";

let db = null;
let currentDbName = null;

const sanitizeMessage = (message) => ({
  id: String(message.id || ""),
  senderId: String(message.senderId || ""),
  conversationId: String(message.conversationId || ""),
  text: String(message.text || ""),
  fileUrl: String(message.fileUrl || ""),
  fileName: String(message.fileName || ""),
  messageType: String(message.messageType || "text"),
  timestamp: Number(message.timestamp || Date.now()),
  seenBy: Array.isArray(message.seenBy) ? [...message.seenBy.map(String)] : [],
  replyTo: message.replyTo
    ? {
        id: String(message.replyTo.id || ""),
        text: String(message.replyTo.text || ""),
        senderName: String(message.replyTo.senderName || ""),
        messageType: String(message.replyTo.messageType || "text"),
        fileName: String(message.replyTo.fileName || ""),
      }
    : null,
});

// Call this on login with the userId — opens a user-specific DB
export const initDB = (userId) =>
  new Promise((resolve) => {
    // Close existing connection if switching users
    if (db) {
      try { db.close(); } catch (_) {}
      db = null;
    }

    const dbName = `chat-app-db-${userId}`;
    currentDbName = dbName;

    const request = indexedDB.open(dbName, 1);

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
      db.onclose = () => { db = null; };
      db.onerror = (ev) => { console.warn("DB error:", ev); };
      resolve(db);
    };

    request.onerror = () => {
      console.warn("IndexedDB open failed");
      db = null;
      resolve(null); // resolve null so app still works
    };

    request.onblocked = () => {
      console.warn("IndexedDB blocked");
      db = null;
      resolve(null);
    };
  });

// Call on logout — closes the connection
export const resetDB = () => {
  if (db) {
    try { db.close(); } catch (_) {}
    db = null;
  }
  currentDbName = null;
};

const getDB = () => db; // just returns cached connection

export const saveMessage = async (message) => {
  const clean = sanitizeMessage(message);
  const database = getDB();
  if (!database) return clean;
  try {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      tx.objectStore(MESSAGES_STORE).put(clean);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("saveMessage failed:", err);
  }
  return clean;
};

export const saveMessages = async (messages) => {
  const database = getDB();
  if (!database) return;
  try {
    const cleaned = messages.map(sanitizeMessage);
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      cleaned.forEach((msg) => store.put(msg));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("saveMessages failed:", err);
  }
};

export const getMessagesByConversation = async (conversationId) => {
  const database = getDB();
  if (!database) return [];
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readonly");
      const index = tx.objectStore(MESSAGES_STORE).index("conversationId");
      const req = index.getAll(IDBKeyRange.only(conversationId));
      req.onsuccess = () =>
        resolve((req.result || []).sort((a, b) => a.timestamp - b.timestamp));
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("getMessagesByConversation failed:", err);
    return [];
  }
};

export const deleteConversationMessages = async (conversationId) => {
  const database = getDB();
  if (!database) return;
  try {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const index = tx.objectStore(MESSAGES_STORE).index("conversationId");
      const req = index.openCursor(IDBKeyRange.only(conversationId));
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
  const database = getDB();
  if (!database) return;
  try {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      let pending = messageIds.length;
      if (pending === 0) return resolve();
      messageIds.forEach((id) => {
        const req = store.get(id);
        req.onsuccess = () => {
          const msg = req.result;
          if (msg && !msg.seenBy?.includes(String(userId))) {
            msg.seenBy = [...(msg.seenBy || []), String(userId)];
            store.put(msg);
          }
          if (--pending === 0) resolve();
        };
        req.onerror = () => { if (--pending === 0) resolve(); };
      });
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("updateMessageSeenStatus failed:", err);
  }
};

export const clearAllMessages = async () => {
  const database = getDB();
  if (!database) return;
  try {
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      tx.objectStore(MESSAGES_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("clearAllMessages failed:", err);
  }
};