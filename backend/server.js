require("dotenv").config();

console.log("TEST PORT =", process.env.PORT);
console.log("TEST MONGO =", process.env.MONGO_URI);

const express = require("express");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");


connectDB();
const app = express();

app.use(express.json()); // to accept json data

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production" || true) {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

// Make io accessible to controllers
app.set('io', io);

const onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    onlineUsers.add(userData._id.toString());
    socket.broadcast.emit("user-online", userData._id);
    socket.emit("connected");
  });

  socket.on("user-online", (userId) => {
    onlineUsers.add(userId.toString());
    socket.broadcast.emit("user-online", userId);
  });

  socket.on("user-offline", (userId) => {
    onlineUsers.delete(userId.toString());
    socket.broadcast.emit("user-offline", userId);
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("mark-read", ({ messageId, chatId }) => {
    socket.to(chatId).emit("message-read", { messageId });
  });

  // Call handling
  socket.on("call-user", ({ offer, chatId, callType, caller }) => {
    socket.to(chatId).emit("incoming-call", { caller, callType, offer });
  });

  socket.on("call-answer", ({ answer, chatId }) => {
    socket.to(chatId).emit("call-accepted", { answer });
  });

  socket.on("accept-call", ({ chatId }) => {
    socket.to(chatId).emit("call-accepted");
  });

  socket.on("reject-call", ({ chatId }) => {
    socket.to(chatId).emit("call-rejected");
  });

  socket.on("ice-candidate", ({ candidate, chatId }) => {
    socket.to(chatId).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED");
    onlineUsers.forEach((userId) => {
      if (socket.rooms.has(userId)) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user-offline", userId);
      }
    });
  });
});
