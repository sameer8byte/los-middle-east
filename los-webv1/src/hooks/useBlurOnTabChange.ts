import { useEffect } from "react";

export const useBlurOnTabChange = () => {
  useEffect(() => {
    const toggleBlur = () => {
      const root = document.getElementById("root");
      if (root) {
        root.style.filter = document.hidden ? "blur(8px)" : "none";
      }
    };

    document.addEventListener("visibilitychange", toggleBlur);
    return () => document.removeEventListener("visibilitychange", toggleBlur);
  }, []);
};
