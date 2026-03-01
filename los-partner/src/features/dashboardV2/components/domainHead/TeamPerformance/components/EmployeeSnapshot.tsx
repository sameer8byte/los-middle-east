import React from 'react';
import { FiUsers, FiShield, FiAlertTriangle, FiUserCheck, FiSettings } from 'react-icons/fi';

interface StatCardProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  bgColor: string;
  iconColor: string;
}

const StatCard = ({ icon, count, label, bgColor, iconColor }: StatCardProps) => (
  <div 
    className="rounded-xl p-6 flex flex-col gap-3"
    style={{ backgroundColor: bgColor, minWidth: '180px', maxWidth: '220px', flex: '1 1 180px' }}
  >
    <div style={{ color: iconColor }}>
      {icon}
    </div>
    <div className="text-4xl font-bold" style={{ color: iconColor }}>
      {count}
    </div>
    <div className="text-sm font-medium" style={{ color: iconColor }}>
      {label}
    </div>
  </div>
);

const EmployeeSnapshot: React.FC = () => {
  // 🔴 API INTEGRATION: Replace mock data with API call
  // const [stats, setStats] = useState<StatCardProps[]>([]);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await getEmployeeSnapshot();
  //       setStats(response.data);
  //     } catch (error) {
  //       console.error('Error fetching employee snapshot:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  // 🔴 REMOVE MOCK DATA BELOW WHEN API IS READY
  const stats = [
    { icon: <FiUsers size={32} />, count: 950, label: 'Total Employees', bgColor: '#2563EB', iconColor: '#FFFFFF' },
    { icon: <FiShield size={32} />, count: 420, label: 'Active Employees', bgColor: '#BBF7D0', iconColor: '#15803D' },
    { icon: <FiAlertTriangle size={32} />, count: 230, label: 'In Active Employees', bgColor: '#FECACA', iconColor: '#DC2626' },
    { icon: <FiUserCheck size={32} />, count: 600, label: 'Managers', bgColor: '#DBEAFE', iconColor: '#1E40AF' },
    { icon: <FiSettings size={32} />, count: 280, label: 'Executives', bgColor: '#F5D0FE', iconColor: '#A21CAF' },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Employee Snapshot</h3>
      <div className="flex gap-4" style={{ flexWrap: 'wrap', maxWidth: '1230px' }}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
};

export default EmployeeSnapshot;
