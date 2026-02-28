import React from "react";
import { FiUser } from "react-icons/fi"; // Default fallback icon

interface AvatarProps {
  name?: string;
  size?: string;    // Tailwind size classes like "w-10 h-10"
  bgColor?: string; // CSS variable like "var(--primary)" or Tailwind class like "bg-[var(--color-primary)] bg-opacity-100"
}

const getInitials = (name?: string): string | null => {
  if (!name || typeof name !== "string") return null;

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({
  name,
  size = "w-10 h-10",
  bgColor = "bg-[var(--secondary)]",
}) => {
  const initials = getInitials(name);

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-semibold overflow-hidden ${bgColor} ${size}`}
      title={name || "User"}
    >
      {initials ? (
        initials
      ) : (
        <FiUser className="text-white w-5 h-5" />
      )}
    </div>
  );
};

export default Avatar;
