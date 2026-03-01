// 🔴 UNCOMMENT BELOW WHEN API IS READY
// import { useState, useEffect } from "react";
// import { getCollectionOverview } from "../../services/dashboardApi";
// import type { CollectionOverviewData } from "../../types/dashboard.types";

import { LuClipboardCheck } from "react-icons/lu";
import { RiListCheck3 } from "react-icons/ri";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  title: string;
  percentage: string;
  fresh: number;
  repeat: number;
  freshPercent: number;
  repeatPercent: number;
  bgColor: string;
  borderColor: string;
}

const StatCard = ({ 
  icon, 
  value, 
  title, 
  percentage, 
  fresh, 
  repeat, 
  freshPercent, 
  repeatPercent, 
  bgColor, 
  borderColor 
}: StatCardProps) => {
  const isBlueCard = bgColor === "bg-[#2563EB]";
  
  return (
    <div 
      className={`${bgColor} ${borderColor} border flex flex-col justify-between`}
      style={{ height: '155px', padding: '12px', borderRadius: '8px' }}
    >
      {/* Top Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div style={{ width: '32px', height: '32px', flexShrink: 0 }}>
            {icon}
          </div>
          <p className={`text-xl font-bold ${isBlueCard ? 'text-white' : 'text-gray-900'} break-words`}>{value}</p>
        </div>
        {!isBlueCard && (
          <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0">
            {percentage}
          </div>
        )}
      </div>
      
      {/* Title */}
      <p className="text-sm leading-tight text-gray-600" style={{ 
        fontWeight: 400,
        color: isBlueCard ? '#FFFFFF' : '#6B7280'
      }}>
        {title}
      </p>
      
      {/* Divider */}
      <div className={`border-t border-dashed ${isBlueCard ? 'border-white/30' : 'border-gray-300'}`}></div>
      
      {/* Bottom Stats */}
      <div className="flex justify-between text-xs">
        <div className="min-w-0">
          <p className={isBlueCard ? 'text-white/80' : 'text-gray-600'}>Fresh : <span className={`font-semibold ${isBlueCard ? 'text-white' : 'text-gray-900'}`}>{fresh}</span></p>
          <p className={`font-semibold ${isBlueCard ? 'text-white' : 'text-gray-900'}`}>{freshPercent}%</p>
        </div>
        <div className="text-right min-w-0">
          <p className={isBlueCard ? 'text-white/80' : 'text-gray-600'}>Repeat : <span className={`font-semibold ${isBlueCard ? 'text-white' : 'text-gray-900'}`}>{repeat}</span></p>
          <p className={`font-semibold ${isBlueCard ? 'text-white' : 'text-gray-900'}`}>{repeatPercent}%</p>
        </div>
      </div>
    </div>
  );
};

export const CollectionOverview = () => {
  // 🔴 UNCOMMENT BELOW WHEN API IS READY
  // const [data, setData] = useState<CollectionOverviewData | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getCollectionOverview();
  //       setData(response);
  //     } catch (err) {
  //       console.error(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REPLACE MOCK DATA WITH: data.casesAllotted, data.underFollowup, etc.
  const stats = [
    { 
      icon: <LuClipboardCheck size={32} color="#FFFFFF" />,
      value: 120,
      title: "Cases Allotted",
      percentage: "43 %",
      fresh: 70,
      repeat: 50,
      freshPercent: 58,
      repeatPercent: 42,
      bgColor: "bg-[#2563EB]",
      borderColor: "border-white"
    },
    { 
      icon: <RiListCheck3 size={32} color="#DDA844" />,
      value: 52,
      title: "Under Followup",
      percentage: "43 %",
      fresh: 32,
      repeat: 20,
      freshPercent: 36,
      repeatPercent: 46,
      bgColor: "bg-[#FFF8E1]",
      borderColor: "border-[#DDA844]"
    },
    { 
      icon: <RiListCheck3 size={32} color="#00A63E" />,
      value: 48,
      title: "Cases Closed",
      percentage: "40 %",
      fresh: 25,
      repeat: 23,
      freshPercent: 56,
      repeatPercent: 56,
      bgColor: "bg-[#E9FED5]",
      borderColor: "border-[#00A63E]"
    },
    { 
      icon: <RiListCheck3 size={32} color="#F63636" />,
      value: 20,
      title: "Post Due Cases",
      percentage: "17 %",
      fresh: 13,
      repeat: 7,
      freshPercent: 19,
      repeatPercent: 14,
      bgColor: "bg-[#FFEBEB]",
      borderColor: "border-[#F63636]"
    },
  ];

  return (
    <div 
      className="bg-white border border-[#F5F5F5] w-full"
      style={{ borderRadius: '20px', gap: '10px' }}
    >
      {/* Header */}
      <div 
        className="bg-[#F5F5F5] px-4"
        style={{ 
          height: '48px',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <h2 className="text-base font-semibold text-gray-900">Collection Pipeline Overview</h2>
      </div>
      
      {/* Cards Container */}
      <div className="grid grid-cols-4 gap-2 p-2">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
};
