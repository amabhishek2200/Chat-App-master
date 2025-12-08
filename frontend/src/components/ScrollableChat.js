import { Avatar } from "@chakra-ui/avatar";
import { Tooltip, Box, Text, IconButton } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import { CheckIcon, CheckCircleIcon } from "@chakra-ui/icons";
import { useState, useRef } from "react";

const VoiceMessage = ({ mediaUrl, duration, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={2} p={2} bg="rgba(0,0,0,0.05)" borderRadius="md">
      <IconButton
        icon={<span>{isPlaying ? "⏸" : "▶"}</span>}
        size="sm"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        colorScheme="teal"
        isRound
      />
      <audio 
        ref={audioRef} 
        src={mediaUrl} 
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
        }}
      />
      <Text fontSize="xs" fontWeight="semibold" color="gray.700">
        🎤 {Math.round(duration || 0)}s
      </Text>
    </Box>
  );
};

const MessageContent = ({ message, isOwn }) => {
  if (message.messageType === "gif" && message.mediaUrl) {
    return (
      <img
        src={message.mediaUrl}
        alt="GIF"
        style={{ maxWidth: "300px", borderRadius: "10px", display: "block" }}
      />
    );
  }

  if (message.messageType === "voice" && message.mediaUrl) {
    return (
      <VoiceMessage
        mediaUrl={message.mediaUrl}
        duration={message.voiceDuration || 0}
        isOwn={isOwn}
      />
    );
  }

  return <span>{message.content}</span>;
};

const ReadReceipt = ({ message, currentUser }) => {
  if (!message.readBy || message.readBy.length === 0) {
    return <CheckIcon color="gray.400" boxSize={3} ml={1} />;
  }

  const isRead = message.readBy.some(
    (userId) => userId.toString() !== currentUser._id.toString()
  );

  return isRead ? (
    <CheckCircleIcon color="blue.500" boxSize={3} ml={1} />
  ) : (
    <CheckIcon color="gray.400" boxSize={3} ml={1} />
  );
};

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div style={{ display: "flex" }} key={m._id}>
            {(isSameSender(messages, m, i, user._id) ||
              isLastMessage(messages, i, user._id)) && (
              <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                <Avatar
                  mt="7px"
                  mr={1}
                  size="sm"
                  cursor="pointer"
                  name={m.sender.name}
                  src={m.sender.pic}
                />
              </Tooltip>
            )}
            <Box
              style={{
                backgroundColor: `${
                  m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"
                }`,
                marginLeft: isSameSenderMargin(messages, m, i, user._id),
                marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                borderRadius: "20px",
                padding: m.messageType === "voice" ? "4px 8px" : "8px 15px",
                maxWidth: "75%",
                display: "flex",
                flexDirection: "column",
                alignItems: m.sender._id === user._id ? "flex-end" : "flex-start",
              }}
            >
              <MessageContent message={m} isOwn={m.sender._id === user._id} />
              {m.sender._id === user._id && (
                <Box display="flex" alignItems="center" mt={1}>
                  <ReadReceipt message={m} currentUser={user} />
                </Box>
              )}
            </Box>
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
