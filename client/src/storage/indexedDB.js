const DB_NAME = process.env.REACT_APP_DB_NAME || "chat-app-db";
const DB_VERSION = 1;
const MESSAGES_STORE = "messages";

let db = null;

export const openDB = () => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

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
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
};

export const saveMessage = async (message) => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    const req = store.put(message);
    req.onsuccess = () => resolve(message);
    req.onerror = () => reject(req.error);
  });
};

export const saveMessages = async (messages) => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    messages.forEach((msg) => store.put(msg));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getMessagesByConversation = async (conversationId) => {
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
};

export const deleteConversationMessages = async (conversationId) => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    const index = store.index("conversationId");
    const req = index.openCursor(conversationId);

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const updateMessageSeenStatus = async (messageIds, userId) => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);

    messageIds.forEach((id) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const msg = req.result;
        if (msg && !msg.seenBy?.includes(userId)) {
          msg.seenBy = [...(msg.seenBy || []), userId];
          store.put(msg);
        }
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearAllMessages = async () => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};
