// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
// import { getLoanClosure } from "../services/dashboardApi";

// 🔴 API INTEGRATION: Type definitions (currently inline, move to ../types/dashboard.types.ts)
interface SmallCardProps {
  value: number;
  label: string;
}

const SmallCard = ({ value, label }: SmallCardProps) => (
  <div 
    className="bg-[#F8FAFF] border border-[#F1F3F7]"
    style={{ width: '149px', height: '68px', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
  >
    <span className="text-2xl font-bold text-gray-900">{value}</span>
    <span className="text-xs text-gray-600">{label}</span>
  </div>
);

interface ClosureCardProps {
  amount: string;
  title: string;
  borderColor: string;
}

const ClosureCard = ({ amount, title, borderColor }: ClosureCardProps) => (
  <div 
    className="bg-white border border-[#F3F4F6] relative overflow-hidden"
    style={{ width: '250px', height: '79px', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}
  >
    <div 
      style={{ 
        position: 'absolute',
        left: 0,
        top: 0,
        width: '4px',
        height: '50%',
        backgroundColor: borderColor
      }}
    />
    <div>
      <div className="text-xl font-bold text-gray-900">{amount}</div>
      <p className="text-xs text-gray-600">{title}</p>
    </div>
  </div>
);

export const LoanClosure = () => {
  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<any>(null);
  // const [loading, setLoading] = useState(true);

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getLoanClosure();
  //       setData(response); // API should return { stats: {...}, closureAmounts: [...] }
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/loan-closure
  // Expected Response: { stats: { activeLoans, closedLoans, onTimeClosure, preClosure, overdueLoans, totalCasesClosed, progressPercentage }, closureAmounts: [...] }
  const smallCards = [
    { value: 300, label: "Active Loans" },
    { value: 120, label: "Closed Loans" },
    { value: 52, label: "On-time Closure" },
    { value: 44, label: "Pre Closure" },
    { value: 76, label: "Overdue Loans" },
  ];
  // 🔴 API INTEGRATION: Replace above with: const smallCards = [{ value: data.stats.activeLoans, label: "Active Loans" }, ...]

  const closureCards = [
    { amount: "₹9 L", title: "Pre Closure", borderColor: "#8B5CF6" },
    { amount: "₹15 L", title: "On Time Closure", borderColor: "#10B981" },
    { amount: "₹8 L", title: "Post Due (Current Due + Penalty)", borderColor: "#EF4444" },
  ];
  // 🔴 API INTEGRATION: Replace above with: const closureCards = data.closureAmounts.map((item, idx) => ({ ...item, borderColor: colors[idx] }));

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '834px', height: '370px', borderRadius: '20px' }}
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
        <h2 className="text-base font-semibold text-gray-900">Loan Closure & Repayment Snapshot (Across Executives)</h2>
      </div>
      
      {/* Content */}
      <div style={{ padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Small Cards Row */}
        <div className="flex gap-3">
          {smallCards.map((card, index) => (
            <SmallCard key={index} {...card} />
          ))}
        </div>

        {/* Total Cases Closed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Cases Closed : <span className="font-bold text-gray-900">120/300 | ₹32 L</span></span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-8 overflow-hidden mb-2" style={{ borderRadius: '4px' }}>
            <div className="h-full bg-blue-500" style={{ width: '40%' }}></div>
          </div>
        </div>

        {/* Percentage Bar */}
        <div className="flex" style={{ width: '798px', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
          <div className="bg-purple-200 flex items-center justify-center text-xs font-semibold" style={{ width: '28%' }}>28%</div>
          <div className="bg-green-200 flex items-center justify-center text-xs font-semibold" style={{ width: '47%' }}>47%</div>
          <div className="bg-red-200 flex items-center justify-center text-xs font-semibold" style={{ width: '25%' }}>25%</div>
        </div>

        {/* Closure Cards */}
        <div className="flex" style={{ width: '798px', gap: '24px' }}>
          {closureCards.map((item, index) => (
            <ClosureCard key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};
