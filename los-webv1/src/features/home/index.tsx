import { useState } from "react";
import { BiCheck } from "react-icons/bi";
import { FaDollarSign } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { useAppSelector } from "../../redux/store";
import { useNavigate } from "react-router-dom";
import { getPageFromId, PageRouteMap } from "../../constant/redirect";
import { motion, AnimatePresence } from "framer-motion";

export default function HomeComponent() {
  const navigate = useNavigate();
  const userData = useAppSelector((state) => state.user);
  const [isHovered, setIsHovered] = useState(false);

  const brand = useAppSelector((state) => state.index);
  const handleClick = () => {
    const step = userData.user.onboardingStep || 1;
    navigate(PageRouteMap[getPageFromId(step)]);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const mascotVariants = {
    hover: { y: -10 },
    initial: { y: 0 },
  };

  const dollarVariants = {
    float: {
      y: [0, -10, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen p-6 bg-gradient-to-br from-amber-50 to-yellow-50"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="max-w-4xl mx-auto">
        <div className="mb-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-amber-900 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {brand.name}
          </motion.h1>
          <motion.p
            className="text-lg text-amber-800/80"
            initial={{ x: -20 }}
            animate={{ x: 0 }}
          >
            Smart Personal Loans in Minutes
          </motion.p>
        </div>

        <motion.div
          className="flex justify-center mb-12"
          variants={itemVariants}
        >
          <motion.div
            className="relative"
            whileHover="hover"
            initial="initial"
            variants={mascotVariants}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute inset-0 bg-amber-200/30 blur-2xl rounded-full" />

            <div className="relative w-64 h-64 bg-teal-500 rounded-full flex items-center justify-center overflow-hidden">
              <motion.div
                className="w-56 h-56 bg-amber-200 rounded-full flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
              >
                <div className="relative">
                  {/* Animated Dollar Icons */}
                  <motion.div
                    className="absolute -right-6 -top-4"
                    variants={dollarVariants}
                    animate="float"
                  >
                    <FaDollarSign className="text-green-600/80 text-xl" />
                  </motion.div>

                  {/* Mascot Illustration */}
                  <div className="relative z-10">
                    <div className="w-36 h-36 flex flex-col items-center justify-center">
                      <div className="relative">
                        {/* Head */}
                        <motion.div
                          className="w-16 h-16 bg-amber-300 rounded-full mb-1 relative"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="absolute bottom-4 w-14 h-8 bg-amber-700 rounded-t-full left-1" />
                          <div className="absolute top-5 w-10 h-3 bg-amber-800 rounded-full left-3" />
                          <div className="absolute w-12 h-4 bg-orange-400 rounded-full top-3 left-2" />
                        </motion.div>

                        {/* Body */}
                        <motion.div
                          className="w-24 h-20 bg-yellow-400 rounded-brand relative"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="absolute top-0 left-0 w-full h-4 bg-red-400 rounded-t-lg" />
                          <motion.div
                            className="absolute right-0 top-3 w-14 h-6 bg-amber-300 rounded-full transform rotate-12 flex items-center justify-end pr-2"
                            animate={{
                              rotate: [12, 15, 12],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                          >
                            <FaDollarSign className="text-green-700 text-sm" />
                          </motion.div>
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Checkmark Badge */}
                  <motion.div
                    className="absolute top-0 right-0 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center transform translate-x-4 -translate-y-2 shadow-lg"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <BiCheck className="text-white text-2xl" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center">
          <motion.h2
            className="text-4xl md:text-6xl font-bold text-amber-900 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Instant Cash Advance
          </motion.h2>

          <motion.button
            className={`group relative w-full max-w-xs mx-auto py-5 px-8 text-lg font-medium rounded-2xl transition-all duration-300 ${
              isHovered ? "bg-amber-500 shadow-xl" : "bg-amber-400 shadow-lg"
            }`}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={handleClick}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-amber-900">Get Started</span>
              <FiArrowRight
                className={`text-amber-900 transition-transform ${
                  isHovered ? "translate-x-1" : ""
                }`}
              />
            </div>

            {/* Hover effect background */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>

          <motion.p
            className="mt-4 text-sm text-amber-800/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Fast approval • No hidden fees • Secure process
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Animated background elements */}
      <AnimatePresence>
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute -z-10 w-8 h-8 bg-amber-200/30 rounded-full"
            initial={{
              scale: 0,
              opacity: 0,
              x: Math.random() * 100 - 50,
              y: Math.random() * 100 - 50,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.3, 0],
              rotate: 360,
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
