import { IconButton, Box, Text } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";

const VoiceRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Calculate duration from chunks or use recorded duration
        const recordedDuration = duration;

        // Flag to ensure callback is called only once
        let callbackCalled = false;

        const sendRecording = (audioDuration) => {
          if (!callbackCalled) {
            callbackCalled = true;
            onRecordingComplete(audioBlob, audioDuration);
            URL.revokeObjectURL(audioUrl);
          }
        };

        // Try to get duration from audio element
        audio.onloadedmetadata = () => {
          const audioDuration = audio.duration || recordedDuration;
          sendRecording(audioDuration);
        };

        // Fallback if metadata doesn't load
        audio.onerror = () => {
          sendRecording(recordedDuration);
        };

        // Timeout fallback
        setTimeout(() => {
          if (!callbackCalled) {
            const audioDuration = (audio.readyState >= 2 && audio.duration) || recordedDuration;
            sendRecording(audioDuration);
          }
        }, 1000);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <IconButton
        icon={<span style={{ fontSize: "18px" }}>{isRecording ? "⏹️" : "🎤"}</span>}
        colorScheme={isRecording ? "red" : "teal"}
        onClick={isRecording ? stopRecording : startRecording}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        size="sm"
        isRound
        _hover={{ transform: "scale(1.1)" }}
        transition="all 0.2s"
      />
      {isRecording && (
        <Text fontSize="sm" color="red.500" fontWeight="bold" display="flex" alignItems="center" gap={1}>
          <span>🔴</span>
          <span>{formatDuration(duration)}</span>
        </Text>
      )}
    </Box>
  );
};

export default VoiceRecorder;


