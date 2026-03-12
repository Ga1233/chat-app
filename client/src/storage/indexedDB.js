const DB_NAME = process.env.REACT_APP_DB_NAME || "chat-app-db";
const MESSAGES_STORE = "messages";

let db = null;
let dbVersion = 1;

// In-memory fallback so UI always works even if IndexedDB fails
const memoryStore = new Map(); // key: conversationId, value: message[]

const addToMemory = (message) => {
  const key = message.conversationId;
  if (!memoryStore.has(key)) memoryStore.set(key, []);
  const msgs = memoryStore.get(key);
  const exists = msgs.find((m) => m.id === message.id);
  if (!exists) msgs.push(message);
  msgs.sort((a, b) => a.timestamp - b.timestamp);
};

// Sanitize to plain cloneable object
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

// Delete the old DB entirely and recreate fresh
const deleteDB = () =>
  new Promise((resolve) => {
    if (db) {
      try { db.close(); } catch (_) {}
      db = null;
    }
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve(); // resolve anyway
    req.onblocked = () => resolve();
  });

const openDB = () =>
  new Promise((resolve, reject) => {
    if (db) {
      try {
        void db.objectStoreNames; // throws if closed
        return resolve(db);
      } catch (_) {
        db = null;
      }
    }

    const request = indexedDB.open(DB_NAME, dbVersion);

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
      db.onerror = () => { db = null; };
      resolve(db);
    };

    request.onerror = () => { db = null; reject(request.error); };
    request.onblocked = () => { db = null; reject(new Error("IndexedDB blocked")); };
  });

// Call this on every login/logout — wipes and recreates the DB fresh
export const resetDB = async () => {
  memoryStore.clear();
  await deleteDB();
  dbVersion = 1; // reset version after delete
};

export const saveMessage = async (message) => {
  const clean = sanitizeMessage(message);
  addToMemory(clean); // always save to memory first
  try {
    const database = await openDB();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      store.put(clean);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("saveMessage DB failed (using memory):", err);
  }
  return clean;
};

export const saveMessages = async (messages) => {
  const cleaned = messages.map(sanitizeMessage);
  cleaned.forEach(addToMemory);
  try {
    const database = await openDB();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      cleaned.forEach((msg) => store.put(msg));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("saveMessages DB failed (using memory):", err);
  }
};

export const getMessagesByConversation = async (conversationId) => {
  // Try IndexedDB first
  try {
    const database = await openDB();
    const results = await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readonly");
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index("conversationId");
      const req = index.getAll(conversationId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (results.length > 0) {
      return results.sort((a, b) => a.timestamp - b.timestamp);
    }
  } catch (err) {
    console.warn("getMessagesByConversation DB failed (using memory):", err);
  }
  // Fallback to memory
  return (memoryStore.get(conversationId) || []).sort((a, b) => a.timestamp - b.timestamp);
};

export const deleteConversationMessages = async (conversationId) => {
  memoryStore.delete(conversationId);
  try {
    const database = await openDB();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index("conversationId");
      const req = index.openCursor(IDBKeyRange.only(conversationId));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("deleteConversationMessages DB failed:", err);
  }
};

export const updateMessageSeenStatus = async (messageIds, userId) => {
  // Update memory store
  memoryStore.forEach((msgs) => {
    msgs.forEach((msg) => {
      if (messageIds.includes(msg.id) && !msg.seenBy?.includes(String(userId))) {
        msg.seenBy = [...(msg.seenBy || []), String(userId)];
      }
    });
  });
  try {
    const database = await openDB();
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
    console.warn("updateMessageSeenStatus DB failed:", err);
  }
};

export const clearAllMessages = async () => {
  memoryStore.clear();
  try {
    const database = await openDB();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(MESSAGES_STORE, "readwrite");
      tx.objectStore(MESSAGES_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("clearAllMessages DB failed:", err);
  }
};