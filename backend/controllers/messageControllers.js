const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, messageType, mediaUrl, voiceDuration } = req.body;

  if ((!content && !mediaUrl) || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    messageType: messageType || "text",
    mediaUrl: mediaUrl || null,
    voiceDuration: voiceDuration || null,
  };

  try {
    var message = await Message.create(newMessage);

    message = await Message.populate(message, [
      { path: "sender", select: "name pic" },
      { path: "chat" }
    ]);
    
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Upload Voice Message
//@route           POST /api/Message/voice
//@access          Protected
const sendVoiceMessage = asyncHandler(async (req, res) => {
  const { chatId, duration } = req.body;
  const audioFile = req.file;

  if (!audioFile) {
    return res.status(400).json({ message: "Audio file is required" });
  }

  if (!chatId) {
    // Delete uploaded file if chatId is missing
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "../uploads/voice", audioFile.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(400).json({ message: "Chat ID is required" });
  }

  // Create media URL - use request host for better compatibility
  const host = req.get('host');
  const protocol = req.protocol || 'http';
  const mediaUrl = `${protocol}://${host}/uploads/voice/${audioFile.filename}`;

  var newMessage = {
    sender: req.user._id,
    content: "🎤 Voice message",
    chat: chatId,
    messageType: "voice",
    mediaUrl: mediaUrl,
    voiceDuration: parseInt(duration) || 0,
  };

  try {
    var message = await Message.create(newMessage);

    message = await Message.populate(message, [
      { path: "sender", select: "name pic" },
      { path: "chat" }
    ]);
    
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    // Delete uploaded file on error
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "../uploads/voice", audioFile.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Mark Message as Read
//@route           PUT /api/Message/read
//@access          Protected
const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.body;

  if (!messageId) {
    return res.status(400).send({ message: "Message ID required" });
  }

  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: req.user._id } },
      { new: true }
    ).populate("sender", "name pic");

    if (!message) {
      return res.status(404).send({ message: "Message not found" });
    }

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, sendVoiceMessage, markMessageAsRead };
