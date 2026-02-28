import React from "react";

type WatermarkProps = {
  userEmail: string;
};

const Watermark: React.FC<WatermarkProps> = ({ userEmail }) => {
  return (
    <div className="fixed top-1/2 left-1/2 z-[9999] opacity-20 text-4xl text-red-500 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 rotate-[-30deg]">
      Confidential – {userEmail}
    </div>
  );
};

export default Watermark;
