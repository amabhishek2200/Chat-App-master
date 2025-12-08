/**
 * Key Exchange Utility
 * Handles sharing encryption keys between users
 */

import { exportKey, importKey, storeChatKey } from "./encryption";

// Share key with another user (for one-on-one chats)
// In a production app, this would use a more secure method like RSA encryption
// For now, we'll store it in the chat metadata or use a secure channel
export const shareKeyWithUser = async (chatId, key, userId) => {
  try {
    // Export the key
    const keyString = await exportKey(key);
    
    // In a real implementation, you would:
    // 1. Get the recipient's public key
    // 2. Encrypt the key with their public key
    // 3. Send it through a secure channel
    
    // For this implementation, we'll store it locally
    // The key will be generated when the first message is sent
    // and both users will have access to it through the chat
    
    return keyString;
  } catch (error) {
    console.error("Error sharing key:", error);
    throw error;
  }
};

// Initialize encryption for a new chat
export const initializeChatEncryption = async (chatId, isGroupChat = false) => {
  try {
    const { generateEncryptionKey, storeChatKey } = await import("./encryption");
    const key = await generateEncryptionKey();
    await storeChatKey(chatId, key);
    return key;
  } catch (error) {
    console.error("Error initializing chat encryption:", error);
    throw error;
  }
};

// For group chats, we need to ensure all members have the key
// This is a simplified version - in production, use proper key distribution
export const ensureGroupChatKey = async (chatId, userIds) => {
  try {
    const { getChatKey, getOrCreateChatKey } = await import("./encryption");
    const key = await getOrCreateChatKey(chatId);
    // In a real implementation, you would:
    // 1. Encrypt the key with each user's public key
    // 2. Store encrypted keys for each user
    // 3. Users decrypt with their private key when joining
    
    return key;
  } catch (error) {
    console.error("Error ensuring group chat key:", error);
    throw error;
  }
};








