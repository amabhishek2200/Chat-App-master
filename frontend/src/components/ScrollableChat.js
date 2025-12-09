import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import { CheckIcon, CheckCircleIcon } from "@chakra-ui/icons";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();

  const renderReadIndicator = (message) => {
    const isRead = message.readBy?.includes(user._id);
    return isRead ? (
      <CheckCircleIcon color="blue.500" boxSize={3} ml={1} />
    ) : (
      <CheckIcon color="gray.400" boxSize={3} ml={1} />
    );
  };

  const renderMessageContent = (message) => {
    if (message.messageType === "gif" && message.mediaUrl) {
      return (
        <img
          src={message.mediaUrl}
          alt="GIF"
          style={{ maxWidth: "100%", borderRadius: "12px" }}
        />
      );
    }

    if (message.messageType === "voice" && message.mediaUrl) {
      return (
        <audio controls src={message.mediaUrl} style={{ maxWidth: "100%" }}>
          Your browser does not support the audio element.
        </audio>
      );
    }

    return message.content;
  };

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
            <span
              style={{
                backgroundColor:
                  m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0",
                marginLeft: isSameSenderMargin(messages, m, i, user._id),
                marginTop: isSameUser(messages, m, i) ? 3 : 10,
                borderRadius: "20px",
                padding: "5px 15px",
                maxWidth: "75%",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {renderMessageContent(m)}
              {m.sender._id === user._id && renderReadIndicator(m)}
            </span>
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;

