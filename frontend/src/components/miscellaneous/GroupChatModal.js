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
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { user, chats, setChats } = ChatState();

  const handleGroup = (userToAdd) => {
    if (selectedUsers.includes(userToAdd)) {
      toast({
        title: "User already added",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    setSelectedUsers([...selectedUsers, userToAdd]);
  };

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
    }
  };

  const handleDelete = (delUser) => {
    setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
  };

  const handleSubmit = async () => {
    if (!groupChatName || !groupChatName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    if (!selectedUsers || selectedUsers.length < 2) {
      toast({
        title: "At least 2 users required",
        description: "Please add at least 2 users to create a group",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
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
      const { data } = await axios.post(
        `/api/chat/group`,
        {
          name: groupChatName.trim(),
          users: JSON.stringify(selectedUsers.map((u) => u._id)),
        },
        config
      );
      setChats([data, ...chats]);
      setGroupChatName("");
      setSelectedUsers([]);
      setSearch("");
      setSearchResult([]);
      onClose();
      toast({
        title: "Group Created Successfully! 🎉",
        description: `${groupChatName} group has been created with ${selectedUsers.length} members`,
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Failed to Create Group!",
        description: error.response?.data?.message || error.response?.data || "Something went wrong",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span onClick={onOpen}>{children}</span>

      <Modal onClose={onClose} isOpen={isOpen} isCentered size="md">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent borderRadius="xl" boxShadow="2xl">
          <ModalHeader
            fontSize="28px"
            fontFamily="Work sans"
            display="flex"
            justifyContent="center"
            color="teal.600"
            fontWeight="bold"
            pb={2}
          >
            Create Group Chat
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDir="column" alignItems="center" pb={6}>
            <FormControl mb={4} isRequired>
              <Input
                placeholder="Enter Group Name"
                mb={3}
                value={groupChatName || ""}
                onChange={(e) => setGroupChatName(e.target.value)}
                size="lg"
                borderRadius="md"
                focusBorderColor="teal.500"
              />
            </FormControl>
            <FormControl mb={3}>
              <Input
                placeholder="Search users by name or email"
                mb={2}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                size="lg"
                borderRadius="md"
                focusBorderColor="teal.500"
              />
            </FormControl>
            {selectedUsers.length > 0 && (
              <Box 
                w="100%" 
                display="flex" 
                flexWrap="wrap" 
                mb={3}
                p={2}
                bg="teal.50"
                borderRadius="md"
                border="1px solid"
                borderColor="teal.200"
              >
                <Text fontSize="xs" color="teal.700" mb={1} w="100%">
                  Selected Users ({selectedUsers.length}):
                </Text>
                {selectedUsers.map((u) => (
                  <UserBadgeItem
                    key={u._id}
                    user={u}
                    handleFunction={() => handleDelete(u)}
                  />
                ))}
              </Box>
            )}
            {loading ? (
              <Box display="flex" justifyContent="center" p={4} w="100%">
                <Spinner size="lg" color="teal.500" thickness="4px" />
              </Box>
            ) : (
              searchResult && searchResult.length > 0 && (
                <Box w="100%" maxH="200px" overflowY="auto" borderRadius="md">
                  {searchResult
                    ?.slice(0, 4)
                    .map((user) => (
                      <UserListItem
                        key={user._id}
                        user={user}
                        handleFunction={() => {
                          handleGroup(user);
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
              onClick={handleSubmit} 
              colorScheme="teal" 
              size="lg"
              isLoading={loading}
              loadingText="Creating..."
              width="100%"
              borderRadius="md"
              fontWeight="semibold"
            >
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
