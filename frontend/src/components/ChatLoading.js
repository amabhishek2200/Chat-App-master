import { Stack } from "@chakra-ui/layout";
import { Skeleton } from "@chakra-ui/skeleton";

const ChatLoading = () => {
  return (
    <Stack spacing={2}>
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
      <Skeleton height="45px" borderRadius="lg" />
    </Stack>
  );
};

export default ChatLoading;
