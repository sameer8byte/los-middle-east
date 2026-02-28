// 🔴 API INTEGRATION: Uncomment imports when backend is ready
// import { useState, useEffect } from "react";
// import { getMyCollectionBucket } from "../services/dashboardApi";

// 🔴 API INTEGRATION: Type definition (currently inline, move to ../types/dashboard.types.ts)
interface BucketCardProps {
  value: number;
  title: string;
  fresh: number;
  repeat: number;
  borderColor: string;
}

const BucketCard = ({ value, title, fresh, repeat, borderColor }: BucketCardProps) => (
  <div 
    className="bg-white flex flex-col justify-between relative overflow-hidden"
    style={{ width: '250px', height: '120px', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
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
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
    
    <div className="border-t border-dashed border-gray-300 w-full"></div>
    
    <div className="flex gap-4 text-sm">
      <div>
        <span className="text-gray-600">Fresh: </span>
        <span className="font-semibold text-gray-900">{fresh}</span>
      </div>
      <div>
        <span className="text-gray-600">Repeat: </span>
        <span className="font-semibold text-gray-900">{repeat}</span>
      </div>
    </div>
  </div>
);

export const MyCollectionBucket = () => {
  // 🔴 API INTEGRATION: Uncomment state management when backend is ready
  // const [data, setData] = useState<BucketCardProps[]>([]);
  // const [loading, setLoading] = useState(true);

  // 🔴 API INTEGRATION: Uncomment useEffect to fetch data from API
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getMyCollectionBucket();
  //       setData(response.buckets); // API should return { buckets: [...] }
  //     } catch (err) {
  //       console.error('Error fetching data:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 API INTEGRATION: REMOVE this hardcoded data when API is ready
  // API Endpoint: GET /api/my-collection-bucket
  // Expected Response: { buckets: [{ value, title, fresh, repeat }] }
  // Note: borderColor values (#3B82F6, #8B5CF6, #F59E0B) are UI constants, keep them hardcoded
  const buckets = [
    { value: 500, title: "Total Loans in Bucket", fresh: 30, repeat: 24, borderColor: "#3B82F6" },
    { value: 1500, title: "Allotted Loans", fresh: 15, repeat: 11, borderColor: "#8B5CF6" },
    { value: 500, title: "Loans yet to be allotted", fresh: 15, repeat: 13, borderColor: "#F59E0B" },
  ];
  // 🔴 API INTEGRATION: Replace above with: const buckets = data.map((item, idx) => ({ ...item, borderColor: colors[idx] }));

  return (
    <div 
      className="bg-white border border-[#F5F5F5]"
      style={{ width: '834px', height: '219px', borderRadius: '20px', gap: '10px' }}
    >
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
        <h2 className="text-base font-semibold text-gray-900">My Lead Bucket</h2>
      </div>
      
      <div 
        className="flex"
        style={{ 
          width: '100%',
          padding: '20px 15px',
          gap: '20px',
          justifyContent: 'space-between'
        }}
      >
        {buckets.map((bucket, index) => (
          <BucketCard key={index} {...bucket} />
        ))}
      </div>
    </div>
  );
};
