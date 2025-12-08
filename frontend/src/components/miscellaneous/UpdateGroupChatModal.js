import { ViewIcon } from "@chakra-ui/icons";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  FormControl,
  Input,
  useToast,
  Box,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";

const UpdateGroupChatModal = ({ fetchMessages, fetchAgain, setFetchAgain }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameloading, setRenameLoading] = useState(false);
  const toast = useToast();

  const { selectedChat, setSelectedChat, user } = ChatState();

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) {
      setSearchResult([]);
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`/api/user?search=${query}`, config);
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!groupChatName || !groupChatName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a new name for the group",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    if (!selectedChat || !user) return;

    try {
      setRenameLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(
        `/api/chat/rename`,
        {
          chatId: selectedChat._id,
          chatName: groupChatName.trim(),
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setRenameLoading(false);
      setGroupChatName("");
      toast({
        title: "Group Renamed! ✅",
        description: `Group name updated to "${groupChatName.trim()}"`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || "Failed to rename group",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setRenameLoading(false);
    }
  };

  const handleAddUser = async (user1) => {
    if (!selectedChat || !user) return;
    
    if (selectedChat.users && selectedChat.users.find((u) => u._id === user1._id)) {
      toast({
        title: "User Already in group!",
        description: "This user is already a member of the group",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    if (selectedChat.groupAdmin && selectedChat.groupAdmin._id !== user._id) {
      toast({
        title: "Only admins can add members!",
        description: "You need to be an admin to add users to this group",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(
        `/api/chat/groupadd`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setLoading(false);
      toast({
        title: "User Added! ✅",
        description: `${user1.name} has been added to the group`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || "Failed to add user",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
    setSearch("");
    setSearchResult([]);
  };

  const handleRemove = async (user1) => {
    if (selectedChat.groupAdmin._id !== user._id && user1._id !== user._id) {
      toast({
        title: "Only admins can remove someone!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.put(
        `/api/chat/groupremove`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      user1._id === user._id ? setSelectedChat() : setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      fetchMessages();
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: error.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
    setGroupChatName("");
  };

  if (!selectedChat) return null;

  return (
    <>
      <IconButton 
        display={{ base: "flex" }} 
        icon={<ViewIcon />} 
        onClick={onOpen} 
        colorScheme="teal"
        size="sm"
        aria-label="View Group Info"
      />

      <Modal onClose={onClose} isOpen={isOpen} isCentered size="lg">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent borderRadius="xl" boxShadow="2xl">
          <ModalHeader
            fontSize="24px"
            fontFamily="Work sans"
            display="flex"
            justifyContent="center"
            color="teal.600"
            fontWeight="bold"
            pb={2}
          >
            👥 {selectedChat.chatName || "Group Chat"}
          </ModalHeader>

          <ModalCloseButton />
          <ModalBody display="flex" flexDir="column" alignItems="center" pb={6}>
            <Box 
              w="100%" 
              display="flex" 
              flexWrap="wrap" 
              pb={3}
              p={3}
              bg="teal.50"
              borderRadius="md"
              border="1px solid"
              borderColor="teal.200"
              mb={4}
            >
              <Text fontSize="sm" color="teal.700" mb={2} w="100%" fontWeight="semibold">
                Group Members ({selectedChat.users?.length || 0}):
              </Text>
              {selectedChat.users && selectedChat.users.length > 0 ? (
                selectedChat.users.map((u) => (
                  <UserBadgeItem
                    key={u._id}
                    user={u}
                    admin={selectedChat.groupAdmin}
                    handleFunction={() => handleRemove(u)}
                  />
                ))
              ) : (
                <Text fontSize="xs" color="gray.500">No members</Text>
              )}
            </Box>
            <FormControl display="flex" mb={4} w="100%">
              <Input
                placeholder="Enter new group name"
                value={groupChatName || ""}
                onChange={(e) => setGroupChatName(e.target.value)}
                size="lg"
                borderRadius="md"
                focusBorderColor="teal.500"
                mr={2}
              />
              <Button
                variant="solid"
                colorScheme="teal"
                isLoading={renameloading}
                onClick={handleRename}
                size="lg"
                borderRadius="md"
              >
                Rename
              </Button>
            </FormControl>
            <FormControl w="100%" mb={3}>
              <Input
                placeholder="Search users to add"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                size="lg"
                borderRadius="md"
                focusBorderColor="teal.500"
              />
            </FormControl>

            {loading ? (
              <Box display="flex" justifyContent="center" p={4} w="100%">
                <Spinner size="lg" color="teal.500" thickness="4px" />
              </Box>
            ) : (
              searchResult && searchResult.length > 0 && (
                <Box w="100%" maxH="200px" overflowY="auto" borderRadius="md">
                  {searchResult.map((user) => (
                    <UserListItem
                      key={user._id}
                      user={user}
                      handleFunction={() => {
                        handleAddUser(user);
                        setSearch("");
                        setSearchResult([]);
                      }}
                    />
                  ))}
                </Box>
              )
            )}
            {!loading && search && searchResult && searchResult.length === 0 && (
              <Text fontSize="sm" color="gray.500" mt={2}>
                No users found
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              onClick={() => handleRemove(user)} 
              colorScheme="red"
              size="lg"
              borderRadius="md"
              width="100%"
              fontWeight="semibold"
            >
              Leave Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
