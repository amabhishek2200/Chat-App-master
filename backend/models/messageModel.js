const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messageType: { 
      type: String, 
      enum: ['text', 'image', 'gif', 'voice', 'video', 'audio'], 
      default: 'text' 
    },
    mediaUrl: { type: String },
    voiceDuration: { type: Number }, // in seconds
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
