import { useState } from "react";
import { CollectionContribution } from "./CollectionContribution";
import { CollectionPerformance } from "./CollectionPerformance";
import { ConversionPerformance } from "./ConversionPerformance";

export const PerformanceTabs = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div 
        className="bg-white border border-[#F5F5F5] cursor-pointer w-full max-w-[1396px]"
        style={{ borderRadius: '20px', marginTop: '24px' }}
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="bg-[#F5F5F5] px-4 flex items-center justify-between cursor-pointer"
          style={{ 
            height: '48px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
          onClick={() => setIsOpen(true)}
        >
          <h2 className="text-base font-semibold text-gray-900">Performance</h2>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1396px', marginTop: '24px' }}>
      {/* Header */}
      <div 
        className="bg-white border border-[#F5F5F5] cursor-pointer mb-4 w-full"
        style={{ borderRadius: '20px' }}
        onClick={() => setIsOpen(false)}
      >
        <div 
          className="bg-[#F5F5F5] px-4 flex items-center justify-between cursor-pointer"
          style={{ 
            height: '48px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
          onClick={() => setIsOpen(false)}
        >
          <h2 className="text-base font-semibold text-gray-900">Performance</h2>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 12.5L10 7.5L5 12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Three Cards Side by Side */}
      <div className="flex flex-col lg:flex-row gap-6">
        <CollectionContribution />
        <CollectionPerformance />
        <ConversionPerformance />
      </div>
    </div>
  );
};;
