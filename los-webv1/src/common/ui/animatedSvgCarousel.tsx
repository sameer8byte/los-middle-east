import React, { useState, useEffect, useCallback, useRef } from "react";
import { BiChevronLeft, BiChevronRight, BiPlay } from "react-icons/bi";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "../../redux/store";
import {
  preloadImages,
  createOptimizedImageUrl,
  createPlaceholderImage,
} from "../../utils/imageUtils";

interface Card {
  title: string;
  description: string;
  imageUrl: string;
}

const ImageCarousel: React.FC<{ cards: Card[] }> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const minSwipeDistance = 50;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }, [cards.length]);

  // Preload images for better performance
  useEffect(() => {
    if (cards.length > 0) {
      const imageUrls = cards.map((card) => card.imageUrl);
      preloadImages(imageUrls)
        .then(() => setImagesPreloaded(true))
        .catch(() => setImagesPreloaded(true)); // Still set to true to continue
    }
  }, [cards]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && !isHovered && cards.length > 1 && imagesPreloaded) {
      intervalRef.current = setInterval(nextSlide, 4000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isHovered, nextSlide, cards.length, imagesPreloaded]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        prevSlide();
      } else if (event.key === "ArrowRight") {
        nextSlide();
      } else if (event.key === " ") {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Image loading handlers
  const handleImageLoad = (index: number) => {
    setImageLoading((prev) => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setImageLoading((prev) => ({ ...prev, [index]: false }));
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const handleImageLoadStart = (index: number) => {
    setImageLoading((prev) => ({ ...prev, [index]: true }));
    setImageErrors((prev) => ({ ...prev, [index]: false }));
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
            <BiPlay className="text-gray-500 text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Content Available
          </h3>
          <p className="text-gray-500 text-sm">
            Content will appear here when available.
          </p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div
      className="w-full max-w-sm mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label="Image carousel"
      aria-live="polite"
    >
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        {/* Image Container */}
        <div className="relative w-full h-96 overflow-hidden bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {imageErrors[currentIndex] ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={createPlaceholderImage(600, 400, "Image unavailable")}
                    alt="Placeholder"
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
              ) : (
                <>
                  {imageLoading[currentIndex] && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={createPlaceholderImage(600, 400, "Loading...")}
                        alt="Loading placeholder"
                        className="w-full h-full object-cover opacity-30"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </div>
                  )}
                  <img
                    src={createOptimizedImageUrl(
                      currentCard.imageUrl,
                      600,
                      400
                    )}
                    alt={currentCard.title}
                    className="h-auto max-w-full object-contain transition-transform duration-700 hover:scale-105"
                    onLoadStart={() => handleImageLoadStart(currentIndex)}
                    onLoad={() => handleImageLoad(currentIndex)}
                    onError={() => handleImageError(currentIndex)}
                    loading="lazy"
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          {cards.length > 1 && (
            <>
              <motion.button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Previous image"
              >
                <BiChevronLeft size={20} />
              </motion.button>

              <motion.button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Next image"
              >
                <BiChevronRight size={20} />
              </motion.button>
            </>
          )}
        </div>

        {/* Content Section */}
        <motion.div
          className="p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-gray-900 text-center mb-3 leading-tight">
                {currentCard.title}
              </h2>
              <p className="text-sm text-gray-600 text-center leading-relaxed">
                {currentCard.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default function AnimatedSvgCarousel() {
  const brand = useAppSelector((state) => state.index);
  const cards: Card[] = brand?.brandCards || [];

  // Add some debugging and error handling
  if (!brand) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 text-center shadow-lg animate-pulse">
          <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  return <ImageCarousel cards={cards} />;
}
