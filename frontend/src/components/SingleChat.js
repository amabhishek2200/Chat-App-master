import { FormControl } from "@chakra-ui/form-control";
import { Box, Text, HStack } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast, Input } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import EmojiPicker from "./miscellaneous/EmojiPicker";
import GifPicker from "./miscellaneous/GifPicker";
import VoiceRecorder from "./miscellaneous/VoiceRecorder";
import CallModal from "./miscellaneous/CallModal";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
const ENDPOINT = window.location.hostname === "localhost" ? "http://localhost:5000" : window.location.origin;
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callOffer, setCallOffer] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

  const fetchMessages = async () => {
    if (!selectedChat || !user) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      if (socket) {
        socket.emit("join chat", selectedChat._id);
      }
    } catch (error) {
      setLoading(false);
      toast({
        title: "Error Occured!",
        description: error.response?.data?.message || "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (messageContent = null, messageType = "text", mediaUrl = null, voiceDuration = null) => {
    const messageToSend = messageContent || newMessage.trim();
    if (!messageToSend && !mediaUrl) return;

    if (socket) {
      socket.emit("stop typing", selectedChat._id);
    }

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      if (!messageContent) {
        setNewMessage("");
      }

      const { data } = await axios.post(
        "/api/message",
        {
          content: messageToSend,
          chatId: selectedChat._id || selectedChat,
          messageType,
          mediaUrl,
          voiceDuration,
        },
        config
      );

      if (socket) {
        socket.emit("new message", data);
        // Mark as read for sender
        socket.emit("mark-read", { messageId: data._id, chatId: selectedChat._id });
      }
      setMessages([...messages, data]);
    } catch (error) {
      if (!messageContent) {
        setNewMessage(messageToSend); // Restore message on error
      }
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || "Failed to send the Message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleSendMessage = (event) => {
    if (event.key === "Enter" && newMessage && selectedChat && user) {
      sendMessage();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleGifSelect = async (gifUrl) => {
    await sendMessage("", "gif", gifUrl);
  };

  const handleVoiceRecording = async (audioBlob, duration) => {
    if (!selectedChat || !user) {
      toast({
        title: "Error",
        description: "Please select a chat first",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `voice-${Date.now()}.webm`);
      formData.append("chatId", selectedChat._id);
      formData.append("duration", Math.round(duration || 0));

      // Don't set Content-Type header - axios will set it automatically with boundary
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post("/api/message/voice", formData, config);

      if (socket) {
        socket.emit("new message", data);
        socket.emit("mark-read", { messageId: data._id, chatId: selectedChat._id });
      }
      setMessages((prev) => [...prev, data]);

      toast({
        title: "Voice message sent! 🎤",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Voice message error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to send voice message",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCall = (type) => {
    setCallType(type);
    setIsCallModalOpen(true);
    setIncomingCall(false);
    setCallOffer(null);
  };

  useEffect(() => {
    if (user) {
      socket = io(ENDPOINT);
      socket.emit("setup", user);
      socket.on("connected", () => {
        setSocketConnected(true);
        socket.emit("user-online", user._id);
      });
      socket.on("typing", () => setIsTyping(true));
      socket.on("stop typing", () => setIsTyping(false));
      socket.on("user-online", (userId) => {
        setOnlineUsers((prev) => [...prev.filter((id) => id !== userId), userId]);
      });
      socket.on("user-offline", (userId) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });
      socket.on("incoming-call", ({ caller: callCaller, callType: incomingCallType, offer }) => {
        setCaller(callCaller);
        setCallType(incomingCallType);
        setCallOffer(offer);
        setIncomingCall(true);
        setIsCallModalOpen(true);
      });
      socket.on("message-read", ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, readBy: [...(msg.readBy || []), user._id] }
              : msg
          )
        );
      });

      return () => {
        socket.emit("user-offline", user._id);
        socket.off("connected");
        socket.off("typing");
        socket.off("stop typing");
        socket.off("user-online");
        socket.off("user-offline");
        socket.off("incoming-call");
        socket.off("message-read");
        socket.disconnect();
      };
    }
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    fetchMessages();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessageRecieved) => {
      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        setNotification((prev) => {
          if (!prev.find((n) => n._id === newMessageRecieved._id)) {
            return [newMessageRecieved, ...prev];
          }
          return prev;
        });
        setFetchAgain((prev) => !prev);
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
      }
    };

    socket.on("message recieved", handleMessageReceived);

    return () => {
      socket.off("message recieved", handleMessageReceived);
    };
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected || !socket || !selectedChat) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing && socket) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {!selectedChat.isGroupChat ? (
              <>
                <Box display="flex" alignItems="center" gap={2}>
                  {getSender(user, selectedChat.users)}
                  {(() => {
                    const otherUser = selectedChat.users.find((u) => u._id !== user._id);
                    const isOnline = otherUser && onlineUsers.includes(otherUser._id);
                    return (
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="50%"
                        bg={isOnline ? "green.500" : "gray.400"}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    );
                  })()}
                </Box>
                <HStack spacing={2}>
                  <IconButton
                    icon={<span style={{ fontSize: "18px" }}>📞</span>}
                    size="sm"
                    colorScheme="teal"
                    onClick={() => handleCall("audio")}
                    aria-label="Audio call"
                    _hover={{ transform: "scale(1.1)", bg: "teal.100" }}
                    transition="all 0.2s"
                    title="Audio Call"
                  />
                  <IconButton
                    icon={<span style={{ fontSize: "18px" }}>📹</span>}
                    size="sm"
                    colorScheme="teal"
                    onClick={() => handleCall("video")}
                    aria-label="Video call"
                    _hover={{ transform: "scale(1.1)", bg: "teal.100" }}
                    transition="all 0.2s"
                    title="Video Call"
                  />
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </HStack>
              </>
            ) : (
              <>
                {selectedChat.chatName?.toUpperCase() || "Group Chat"}
                <UpdateGroupChatModal
                  fetchMessages={fetchMessages}
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                />
              </>
            )}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl
              onKeyDown={handleSendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              <HStack spacing={2} alignItems="center">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <GifPicker onGifSelect={handleGifSelect} />
                <VoiceRecorder onRecordingComplete={handleVoiceRecording} />
                <Input
                  variant="filled"
                  bg="#E0E0E0"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={typingHandler}
                  flex={1}
                  borderRadius="full"
                  _focus={{ bg: "#F0F0F0", borderColor: "teal.500" }}
                />
              </HStack>
            </FormControl>
            {isCallModalOpen && (
              <CallModal
                isOpen={isCallModalOpen}
                onClose={() => {
                  setIsCallModalOpen(false);
                  setIncomingCall(false);
                  setCaller(null);
                  setCallOffer(null);
                }}
                callType={callType}
                selectedChat={selectedChat}
                incomingCall={incomingCall}
                caller={caller}
                offer={callOffer}
              />
            )}
          </Box>
        </>
      ) : (
        // to get socket.io on same page
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
