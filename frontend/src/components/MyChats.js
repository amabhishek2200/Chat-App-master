import { AddIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { Button } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";
import {
  getChatKey,
  decryptMessage,
  isEncrypted,
  extractEncryptedContent,
} from "../utils/encryption";
import io from "socket.io-client";

const ENDPOINT = "http://localhost:5000";
var socket;

// Component to display latest message with decryption
const LatestMessagePreview = ({ message, chatId }) => {
  const [decryptedContent, setDecryptedContent] = useState(null);

  useEffect(() => {
    const decryptLatestMessage = async () => {
      if (isEncrypted(message.content)) {
        try {
          const key = await getChatKey(chatId);
          if (key) {
            const encryptedContent = extractEncryptedContent(message.content);
            const decrypted = await decryptMessage(encryptedContent, key);
            setDecryptedContent(decrypted);
          } else {
            setDecryptedContent("[Encrypted]");
          }
        } catch (error) {
          setDecryptedContent("[Encrypted]");
        }
      } else {
        setDecryptedContent(message.content);
      }
    };

    decryptLatestMessage();
  }, [message.content, chatId]);

  const displayContent = decryptedContent || "[Loading...]";
  const truncatedContent =
    displayContent.length > 50
      ? displayContent.substring(0, 51) + "..."
      : displayContent;

  return (
    <Text fontSize="xs">
      <b>{message.sender.name} : </b>
      {truncatedContent}
    </Text>
  );
};

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();

  const { selectedChat, setSelectedChat, user, chats, setChats, notification, setNotification } = ChatState();

  const toast = useToast();

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/chat", config);
      setChats(data || []);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      try {
        setLoggedUser(JSON.parse(userInfo));
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
    if (user) {
      fetchChats();
    }
    // eslint-disable-next-line
  }, [fetchAgain, user]);

  // Setup socket connection and listen for group addition events
  useEffect(() => {
    if (!user) return;

    socket = io(ENDPOINT);
    socket.emit("setup", user);
    
    const handleAddedToGroup = (data) => {
      const { chat, addedBy } = data;
      
      if (!chat || !addedBy) return;
      
      // Add the group to chats list if not already present
      setChats((prevChats) => {
        if (prevChats && !prevChats.find((c) => c._id === chat._id)) {
          return [chat, ...prevChats];
        }
        return prevChats;
      });
      
      // Show notification
      const notificationData = {
        _id: chat._id + Date.now(),
        chat: chat,
        addedBy: addedBy,
        isGroupInvitation: true,
      };
      
      setNotification((prevNotifications) => [notificationData, ...prevNotifications]);
      
      toast({
        title: "Added to Group! 🎉",
        description: `${addedBy.name || 'Admin'} added you to ${chat.chatName || 'a group'}`,
        status: "info",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    };

    socket.on("added-to-group", handleAddedToGroup);

    return () => {
      if (socket) {
        socket.off("added-to-group", handleAddedToGroup);
        socket.disconnect();
      }
    };
    // eslint-disable-next-line
  }, [user]);

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={3}
      bg="white"
      w={{ base: "100%", md: "31%" }}
      borderRadius="lg"
      borderWidth="1px"
      boxShadow="md"
    >
      <Box
        pb={3}
        px={3}
        fontSize={{ base: "28px", md: "30px" }}
        fontFamily="Work sans"
        display="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontSize="2xl" fontWeight="bold" color="teal.600">
          My Chats
        </Text>
        <GroupChatModal>
          <Button
            display="flex"
            fontSize={{ base: "17px", md: "10px", lg: "17px" }}
            rightIcon={<AddIcon />}
            colorScheme="teal"
            size="sm"
          >
            New Group Chat
          </Button>
        </GroupChatModal>
      </Box>
      <Box
        display="flex"
        flexDir="column"
        p={3}
        bg="#F8F8F8"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          chats.length > 0 ? (
            <Stack overflowY="scroll" spacing={2}>
              {chats.map((chat) => (
                <Box
                  onClick={() => setSelectedChat(chat)}
                  cursor="pointer"
                  bg={selectedChat?._id === chat._id ? "teal.500" : "#E8E8E8"}
                  color={selectedChat?._id === chat._id ? "white" : "black"}
                  px={3}
                  py={3}
                  borderRadius="lg"
                  key={chat._id}
                  _hover={{
                    bg: selectedChat?._id === chat._id ? "teal.600" : "#D0D0D0",
                    transform: "translateX(5px)",
                    transition: "all 0.2s",
                    boxShadow: "md",
                  }}
                  transition="all 0.2s"
                  borderLeft={selectedChat?._id === chat._id ? "4px solid" : "none"}
                  borderColor={selectedChat?._id === chat._id ? "teal.700" : "transparent"}
                >
                  <Text fontWeight={selectedChat?._id === chat._id ? "bold" : "semibold"} fontSize="md">
                    {!chat.isGroupChat
                      ? getSender(loggedUser, chat.users)
                      : `👥 ${chat.chatName}`}
                  </Text>
                  {chat.latestMessage && (
                    <LatestMessagePreview
                      message={chat.latestMessage}
                      chatId={chat._id}
                    />
                  )}
                  {!chat.latestMessage && (
                    <Text fontSize="xs" color={selectedChat?._id === chat._id ? "teal.100" : "gray.500"} fontStyle="italic">
                      No messages yet
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Box display="flex" flexDir="column" alignItems="center" justifyContent="center" h="100%" p={4}>
              <Text fontSize="lg" color="gray.500" textAlign="center">
                No chats yet. Start a conversation!
              </Text>
            </Box>
          )
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
