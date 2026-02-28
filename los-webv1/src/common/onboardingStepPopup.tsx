import React, { useEffect, useState } from "react";
import { useAppSelector } from "../redux/store";
import Dialog from "./dialog";
import {
  ApplicationPageType,
  getPageFromId,
  PageIdToPageMap,
} from "../constant/redirect";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiArrowRight } from "react-icons/fi";

interface OnBoardingStepProps {
  pageKey: ApplicationPageType;
}

const OnBoardingStep: React.FC<OnBoardingStepProps> = ({ pageKey }) => {
  const user = useAppSelector((state) => state.user.user);
  const currentStep = user?.onboardingStep;
  const [isVisible, setIsVisible] = useState(false);
  const pageId = getPageFromId(currentStep);

  useEffect(() => {
    if (pageId === pageKey) return;
    // Add slight delay for animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    // Cleanup function to clear the timer
    return () => clearTimeout(timer);
  }, [pageId, pageKey]);

  if (pageId === pageKey) return null;

  const redirectUrl = PageIdToPageMap[currentStep];
  if (!redirectUrl) return null;
  const pageName = redirectUrl.split("/").pop();
  const pageTitle =
    pageName?.charAt(0).toUpperCase() + (pageName || "").slice(1);

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        duration: 0.4,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const iconVariants = {
    animate: {
      scale: [1, 1.1, 1],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      y: -2,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      y: 0,
      transition: { duration: 0.1 },
    },
  };

  if (!user || !user.id) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <Dialog
        title ="Action Required"
        isOpen={true} onClose={() => {}} >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            className="relative overflow-hidden"
          >
            {/* Background Gradient */}
            <div 
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-warning/5 rounded-[var(--radius-brand)]" />

            {/* Content Container */}
            <div className="relative px-6 py-8 sm:px-8 sm:py-10">
              {/* Header Section */}
              <div className="text-center mb-8">
                {/* Animated Icon */}
                <div className="mb-6 flex justify-center">
                  <motion.div
                    variants={iconVariants}
                    animate="animate"
                    className="relative"
                  >
                    {/* Icon Background Circle */}
                    <div className="absolute inset-0 bg-warning/10 rounded-full blur-xl scale-150" />
                    <div className="relative bg-gradient-to-br from-warning/20 to-warning/30 p-4 rounded-2xl backdrop-blur-sm border border-warning/20">
                      <FiAlertTriangle className="h-12 w-12 text-warning drop-shadow-sm" aria-hidden="true" />
                    </div>
                  </motion.div>
                </div>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-on-surface/70 mb-2">
                  Complete Your{" "}
                  <span className="font-semibold text-primary">{pageTitle}</span> Step
                </p>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center mt-4 mb-6">
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4].map((step, index) => (
                      <div
                        key={step}
                        className={`h-2 w-8 rounded-full transition-all duration-300 ${
                          index <= currentStep ? "bg-primary" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="space-y-4">
                {/* Primary CTA Button */}
                <motion.a
                  href={redirectUrl}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="group relative w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl
                    bg-gradient-to-r from-primary via-primary-hover to-primary-active text-on-primary font-semibold text-lg
                    shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35
                    focus:outline-none focus:ring-2 focus:ring-primary-focus focus:ring-offset-2
                    transition-all duration-300 overflow-hidden"
                  aria-label={`Continue to ${pageTitle}`}
                >
                  {/* Button Background Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-hover via-primary-active to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Button Content */}
                  <span className="relative flex items-center">
                    Continue to {pageTitle}
                    <motion.div
                      className="ml-3"
                      animate={{ x: [0, 4, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <FiArrowRight className="h-5 w-5" />
                    </motion.div>
                  </span>
                </motion.a>

                {/* Secondary Information */}
                <div className="text-center">
                  <p className="text-sm text-on-surface/60 mb-4">
                    This step is required to continue using the app
                  </p>

                  {/* Support Link */}
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <span className="text-on-surface/50">Need help?</span>
                    <a
                      href="/support"
                      className="text-primary font-medium hover:text-primary-hover transition-colors duration-200 hover:underline decoration-primary/30 underline-offset-4"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 opacity-20">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-full blur-lg" />
              </div>
              <div className="absolute bottom-4 left-4 opacity-10">
                <div className="w-8 h-8 bg-gradient-to-br from-warning to-warning-hover rounded-full blur-md" />
              </div>
            </div>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default OnBoardingStep;
