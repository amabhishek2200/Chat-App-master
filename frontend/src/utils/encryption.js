/**
 * End-to-End Encryption Utility
 * Uses Web Crypto API for AES-GCM encryption
 */

// Generate a random encryption key for a chat
export const generateEncryptionKey = async () => {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );
    return key;
  } catch (error) {
    console.error("Error generating encryption key:", error);
    throw error;
  }
};

// Export key to store in localStorage
export const exportKey = async (key) => {
  try {
    const exported = await crypto.subtle.exportKey("raw", key);
    const exportedKeyBuffer = new Uint8Array(exported);
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...exportedKeyBuffer));
  } catch (error) {
    console.error("Error exporting key:", error);
    throw error;
  }
};

// Import key from base64 string
export const importKey = async (keyString) => {
  try {
    const keyBuffer = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  } catch (error) {
    console.error("Error importing key:", error);
    throw error;
  }
};

// Encrypt message content
export const encryptMessage = async (message, key) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Generate a random IV (Initialization Vector) for each message
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for transmission
    const base64 = btoa(String.fromCharCode(...combined));
    return base64;
  } catch (error) {
    console.error("Error encrypting message:", error);
    throw error;
  }
};

// Decrypt message content
export const decryptMessage = async (encryptedMessage, key) => {
  try {
    // Convert from base64
    const combined = Uint8Array.from(
      atob(encryptedMessage),
      (c) => c.charCodeAt(0)
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Error decrypting message:", error);
    throw error;
  }
};

// Key Management - Store key for a chat
export const storeChatKey = async (chatId, key) => {
  try {
    const keyString = await exportKey(key);
    const keys = getStoredKeys();
    keys[chatId] = keyString;
    localStorage.setItem("chatEncryptionKeys", JSON.stringify(keys));
  } catch (error) {
    console.error("Error storing chat key:", error);
    throw error;
  }
};

// Key Management - Get key for a chat
export const getChatKey = async (chatId) => {
  try {
    const keys = getStoredKeys();
    const keyString = keys[chatId];
    if (!keyString) {
      return null;
    }
    return await importKey(keyString);
  } catch (error) {
    console.error("Error getting chat key:", error);
    return null;
  }
};

// Get all stored keys
const getStoredKeys = () => {
  try {
    const stored = localStorage.getItem("chatEncryptionKeys");
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error getting stored keys:", error);
    return {};
  }
};

// Generate or retrieve key for a chat
export const getOrCreateChatKey = async (chatId) => {
  try {
    let key = await getChatKey(chatId);
    if (!key) {
      key = await generateEncryptionKey();
      await storeChatKey(chatId, key);
    }
    return key;
  } catch (error) {
    console.error("Error getting or creating chat key:", error);
    throw error;
  }
};

// Check if message is encrypted (has encryption marker)
export const isEncrypted = (content) => {
  return typeof content === "string" && content.startsWith("E2E:");
};

// Extract encrypted content (remove marker)
export const extractEncryptedContent = (content) => {
  if (isEncrypted(content)) {
    return content.substring(4); // Remove "E2E:" prefix
  }
  return content;
};

// Add encryption marker
export const markAsEncrypted = (content) => {
  return `E2E:${content}`;
};








