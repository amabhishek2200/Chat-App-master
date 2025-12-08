import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Box,
  Text,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { useState, useEffect, useRef } from "react";
import { ChatState } from "../../Context/ChatProvider";
import io from "socket.io-client";

const ENDPOINT = "http://localhost:5000";

const CallModal = ({ isOpen, onClose, callType, selectedChat, incomingCall, caller, offer }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const { user } = ChatState();
  const toast = useToast();

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    if (isOpen && !incomingCall) {
      initializeCall();
    }
    return () => {
      if (!incomingCall) {
        endCall();
      }
    };
  }, [isOpen, incomingCall]);

  const initializeCall = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support video/audio calls. Please use a modern browser like Chrome, Firefox, or Edge.");
      }

      socketRef.current = io(ENDPOINT);
      
      // Wait for socket to connect before proceeding
      if (!socketRef.current.connected) {
        await new Promise((resolve, reject) => {
          if (!socketRef.current) {
            reject(new Error("Socket initialization failed"));
            return;
          }
          
          const timeout = setTimeout(() => {
            reject(new Error("Socket connection timeout"));
          }, 5000);
          
          socketRef.current.once("connect", () => {
            clearTimeout(timeout);
            resolve();
          });
          
          socketRef.current.once("connect_error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }
      
      // Join the chat room to send/receive call events
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("join chat", selectedChat._id);
      }
      
      // Request media with better error handling
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: true,
        });
      } catch (mediaError) {
        let errorMessage = "Failed to access camera/microphone. ";
        
        if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
          errorMessage += "Please allow camera and microphone permissions in your browser settings.";
        } else if (mediaError.name === "NotFoundError" || mediaError.name === "DevicesNotFoundError") {
          errorMessage += callType === "video" 
            ? "No camera found. Please connect a camera and try again."
            : "No microphone found. Please connect a microphone and try again.";
        } else if (mediaError.name === "NotReadableError" || mediaError.name === "TrackStartError") {
          errorMessage += "Camera or microphone is being used by another application. Please close other apps and try again.";
        } else if (mediaError.name === "OverconstrainedError") {
          errorMessage += "Camera or microphone doesn't support the required settings.";
        } else {
          errorMessage += mediaError.message || "Unknown error occurred.";
        }
        
        throw new Error(errorMessage);
      }

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            chatId: selectedChat._id,
          });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("call-user", {
          offer,
          chatId: selectedChat._id,
          callType,
          caller: user,
        });
      } else {
        throw new Error("Socket not connected");
      }

      socketRef.current.on("call-accepted", async ({ answer }) => {
        if (answer && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            setIsCallActive(true);
          } catch (error) {
            console.error("Error setting remote description:", error);
          }
        }
      });

      socketRef.current.on("call-rejected", () => {
        toast({
          title: "Call Rejected",
          status: "info",
          duration: 3000,
        });
        endCall();
      });

      socketRef.current.on("ice-candidate", async ({ candidate }) => {
        if (candidate && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      });
    } catch (error) {
      console.error("Error initializing call:", error);
      
      // Clean up on error
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initialize call. Please check permissions and try again.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
      
      // Close the modal on error
      onClose();
    }
  };

  const handleAcceptCall = async () => {
    try {
      // Initialize socket if not already initialized
      if (!socketRef.current) {
        socketRef.current = io(ENDPOINT);
        
        // Wait for socket to connect before proceeding
        if (!socketRef.current.connected) {
          await new Promise((resolve, reject) => {
            if (!socketRef.current) {
              reject(new Error("Socket initialization failed"));
              return;
            }
            
            const timeout = setTimeout(() => {
              reject(new Error("Socket connection timeout"));
            }, 5000);
            
            socketRef.current.once("connect", () => {
              clearTimeout(timeout);
              resolve();
            });
            
            socketRef.current.once("connect_error", (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        }
        
        // Join the chat room to receive call events
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("join chat", selectedChat._id);
        }
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support video/audio calls. Please use a modern browser like Chrome, Firefox, or Edge.");
      }

      // Get user media with better error handling
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: true,
        });
      } catch (mediaError) {
        let errorMessage = "Failed to access camera/microphone. ";
        
        if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
          errorMessage += "Please allow camera and microphone permissions in your browser settings.";
        } else if (mediaError.name === "NotFoundError" || mediaError.name === "DevicesNotFoundError") {
          errorMessage += callType === "video" 
            ? "No camera found. Please connect a camera and try again."
            : "No microphone found. Please connect a microphone and try again.";
        } else if (mediaError.name === "NotReadableError" || mediaError.name === "TrackStartError") {
          errorMessage += "Camera or microphone is being used by another application. Please close other apps and try again.";
        } else if (mediaError.name === "OverconstrainedError") {
          errorMessage += "Camera or microphone doesn't support the required settings.";
        } else {
          errorMessage += mediaError.message || "Unknown error occurred.";
        }
        
        throw new Error(errorMessage);
      }

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("ice-candidate", {
            candidate: event.candidate,
            chatId: selectedChat._id,
          });
        }
      };

      // Set up socket listeners for incoming call acceptance
      socketRef.current.on("ice-candidate", async ({ candidate }) => {
        if (candidate && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      });

      // Set the remote description with the offer
      if (offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create and set local description (answer)
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer to caller
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("call-answer", {
            answer,
            chatId: selectedChat._id,
          });

          setIsCallActive(true);
        } else {
          throw new Error("Socket not connected");
        }
      } else {
        throw new Error("No offer received");
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      
      // Clean up on error
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      toast({
        title: "Call Failed",
        description: error.message || "Failed to accept call. Please check permissions and try again.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
      
      endCall();
    }
  };

  const handleRejectCall = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("reject-call", {
        chatId: selectedChat._id,
      });
    }
    endCall();
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.off("ice-candidate");
      socketRef.current.off("call-accepted");
      socketRef.current.off("call-rejected");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={endCall} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {incomingCall ? "Incoming Call" : callType === "video" ? "Video Call" : "Audio Call"}
        </ModalHeader>
        <ModalBody>
          <Box position="relative" w="100%" h="400px" bg="black" borderRadius="md">
            {callType === "video" && (
              <>
                {remoteStream && (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                {localStream && (
                  <Box
                    position="absolute"
                    bottom={4}
                    right={4}
                    w="150px"
                    h="100px"
                    borderRadius="md"
                    overflow="hidden"
                    border="2px solid white"
                  >
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </Box>
                )}
              </>
            )}
            {callType === "audio" && (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                h="100%"
                flexDir="column"
              >
                <Text fontSize="4xl" mb={4}>
                  {incomingCall ? caller?.name || "Unknown" : "Calling..."}
                </Text>
                {isCallActive && <Text color="green.400">Call Active</Text>}
              </Box>
            )}
          </Box>
        </ModalBody>
        <ModalFooter justifyContent="center" gap={4}>
          {incomingCall ? (
            <>
              <Button 
                colorScheme="green" 
                onClick={handleAcceptCall} 
                leftIcon={<span style={{ fontSize: "18px" }}>📞</span>}
                size="lg"
                borderRadius="full"
              >
                Accept
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleRejectCall} 
                leftIcon={<CloseIcon />}
                size="lg"
                borderRadius="full"
              >
                Reject
              </Button>
            </>
          ) : (
            <Button 
              colorScheme="red" 
              onClick={endCall} 
              leftIcon={<CloseIcon />}
              size="lg"
              borderRadius="full"
            >
              End Call
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;


