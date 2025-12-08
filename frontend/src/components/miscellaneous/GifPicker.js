import { Box, Popover, PopoverTrigger, PopoverContent, PopoverBody, Input, Spinner, Text } from "@chakra-ui/react";
import { IconButton } from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";

const GifPicker = ({ onGifSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY || "YOUR_GIPHY_API_KEY";

  const searchGifs = async (query) => {
    if (!query || !GIPHY_API_KEY || GIPHY_API_KEY === "YOUR_GIPHY_API_KEY") {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20&rating=g`
      );
      setGifs(response.data.data);
    } catch (error) {
      console.error("Error fetching GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 2) {
      searchGifs(value);
    }
  };

  const handleGifClick = (gif) => {
    onGifSelect(gif.images.fixed_height.url);
    setIsOpen(false);
    setSearchTerm("");
    setGifs([]);
  };

  return (
    <Popover isOpen={isOpen} onClose={() => setIsOpen(false)} placement="top">
      <PopoverTrigger>
        <IconButton
          icon={<span style={{ fontSize: "18px" }}>🎬</span>}
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Add GIF"
          _hover={{ transform: "scale(1.1)", bg: "teal.50" }}
          transition="all 0.2s"
        />
      </PopoverTrigger>
      <PopoverContent w="400px" maxH="500px">
        <PopoverBody>
          <Input
            placeholder="Search GIFs..."
            value={searchTerm}
            onChange={handleSearch}
            mb={3}
            size="sm"
          />
          {GIPHY_API_KEY === "YOUR_GIPHY_API_KEY" ? (
            <Text fontSize="sm" color="gray.500" textAlign="center" p={4}>
              Please add your GIPHY API key in .env file as REACT_APP_GIPHY_API_KEY
              <br />
              <a
                href="https://developers.giphy.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "blue", textDecoration: "underline" }}
              >
                Get API Key
              </a>
            </Text>
          ) : loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Spinner size="lg" />
            </Box>
          ) : gifs.length > 0 ? (
            <Box
              display="grid"
              gridTemplateColumns="repeat(2, 1fr)"
              gap={2}
              maxH="400px"
              overflowY="auto"
            >
              {gifs.map((gif) => (
                <Box
                  key={gif.id}
                  as="button"
                  onClick={() => handleGifClick(gif)}
                  _hover={{ opacity: 0.8 }}
                  borderRadius="md"
                  overflow="hidden"
                >
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    style={{ width: "100%", height: "auto" }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Text fontSize="sm" color="gray.500" textAlign="center" p={4}>
              {searchTerm.length > 2 ? "No GIFs found" : "Search for GIFs..."}
            </Text>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;


