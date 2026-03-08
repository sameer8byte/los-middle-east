import React, { useState, useEffect, useCallback, useRef } from "react";
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

// How many "stacked" cards to peek behind the active one
const STACK_DEPTH = 3;

const ImageCarousel: React.FC<{ cards: Card[] }> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = forward, -1 = back
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const minSwipeDistance = 50;

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }, [cards.length]);

  useEffect(() => {
    if (cards.length > 0) {
      const imageUrls = cards.map((card) => card.imageUrl);
      preloadImages(imageUrls)
        .then(() => setImagesPreloaded(true))
        .catch(() => setImagesPreloaded(true));
    }
  }, [cards]);

  useEffect(() => {
    if (!isHovered && cards.length > 1 && imagesPreloaded) {
      intervalRef.current = setInterval(nextSlide, 3500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, nextSlide, cards.length, imagesPreloaded]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) nextSlide();
    else if (distance < -minSwipeDistance) prevSlide();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      else if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // When there's no content, still render a "stack" using the empty state image
  if (!cards || cards.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto relative cursor-default" style={{ height: "440px" }}>
        {[2, 1, 0].map((depth) => (
          <div
            key={`empty-stack-${depth}`}
            className="absolute inset-x-0 top-0 mx-auto rounded-2xl overflow-hidden bg-white shadow-lg"
            style={{
              width: `${100 - depth * 4}%`,
              height: "380px",
              top: `${depth * 10}px`,
              left: "50%",
              transform: `translateX(-50%) rotate(${depth === 0 ? 0 : depth % 2 === 0 ? depth * 1.5 : -depth * 1.5}deg) scale(${1 - depth * 0.04})`,
              zIndex: 10 - depth,
              opacity: 1 - depth * 0.15,
              filter: `brightness(${1 - depth * 0.08})`,
            }}
          >
            <img
              src="/carousel-empty-state.png"
              alt="No content available"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {/* Placeholder dots structure */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 mt-4">
          <div className="rounded-full bg-gray-300" style={{ width: 20, height: 7 }} />
          <div className="rounded-full bg-gray-300" style={{ width: 7, height: 7 }} />
          <div className="rounded-full bg-gray-300" style={{ width: 7, height: 7 }} />
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  // Build the stack of "behind" cards (next 2 cards peeking behind)
  const stackCards = Array.from({ length: Math.min(STACK_DEPTH - 1, cards.length - 1) }, (_, i) => {
    const idx = (currentIndex + i + 1) % cards.length;
    return { idx, depth: i + 1 };
  });

  // Variants for the active (front) card
  const frontVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 320 : -320,
      rotate: dir > 0 ? 15 : -15,
      opacity: 0,
      scale: 0.85,
      zIndex: 10,
    }),
    center: {
      x: 0,
      rotate: 0,
      opacity: 1,
      scale: 1,
      zIndex: 10,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -320 : 320,
      rotate: dir > 0 ? -20 : 20,
      opacity: 0,
      scale: 0.8,
      zIndex: 10,
    }),
  };

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
    >
      {/* Stack container — relative so cards overlap */}
      <div className="relative" style={{ height: "440px" }}>

        {/* Stacked cards behind (rendered back-to-front) */}
        {[...stackCards].reverse().map(({ idx, depth }) => (
          <div
            key={`stack-${idx}`}
            className="absolute inset-x-0 top-0 mx-auto rounded-2xl overflow-hidden bg-white shadow-lg"
            style={{
              width: `${100 - depth * 4}%`,
              height: "380px",
              top: `${depth * 10}px`,
              left: "50%",
              transform: `translateX(-50%) rotate(${depth % 2 === 0 ? depth * 1.5 : -depth * 1.5}deg) scale(${1 - depth * 0.04})`,
              zIndex: 10 - depth,
              opacity: 1 - depth * 0.15,
              transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            {cards[idx]?.imageUrl && (
              <img
                src={createOptimizedImageUrl(cards[idx].imageUrl, 600, 400)}
                alt={cards[idx].title}
                className="w-full h-full object-cover"
                style={{ filter: `brightness(${0.9 - depth * 0.1})` }}
              />
            )}
          </div>
        ))}

        {/* Active (front) card */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={frontVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 28,
              mass: 0.9,
            }}
            className="absolute inset-x-0 top-0 mx-auto rounded-2xl overflow-hidden bg-white cursor-grab active:cursor-grabbing"
            style={{
              width: "100%",
              height: "380px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) nextSlide();
              else if (info.offset.x > 80) prevSlide();
            }}
            whileDrag={{ scale: 0.97, rotate: 2 }}
          >
            {imageErrors[currentIndex] ? (
              <img
                src={createPlaceholderImage(600, 400, "Image unavailable")}
                alt="Placeholder"
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <img
                src={createOptimizedImageUrl(currentCard.imageUrl, 600, 400)}
                alt={currentCard.title}
                className="w-full h-full object-cover"
                onError={() => setImageErrors((prev) => ({ ...prev, [currentIndex]: true }))}
                loading="lazy"
              />
            )}

            {/* Gradient overlay with text */}
            <div
              className="absolute bottom-0 inset-x-0 p-5"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                >
                  <h2 className="font-bold text-white text-center leading-tight" style={{ fontSize: "1.1rem" }}>
                    {currentCard.title}
                  </h2>
                  {currentCard.description && (
                    <p className="text-white/80 text-center mt-1" style={{ fontSize: "0.82rem" }}>
                      {currentCard.description}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        {cards.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none"
              style={{ width: 36, height: 36, zIndex: 20 }}
              aria-label="Previous"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none"
              style={{ width: 36, height: 36, zIndex: 20 }}
              aria-label="Next"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentIndex ? 1 : -1);
                setCurrentIndex(i);
              }}
              className="rounded-full transition-all duration-300 focus:outline-none"
              style={{
                width: i === currentIndex ? 20 : 7,
                height: 7,
                background: i === currentIndex ? "var(--primary, #6366f1)" : "#d1d5db",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function AnimatedSvgCarousel() {
  const brand = useAppSelector((state) => state.index);
  const cards: Card[] = brand?.brandCards || [];

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
