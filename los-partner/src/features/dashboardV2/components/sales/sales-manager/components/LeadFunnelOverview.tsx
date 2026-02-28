import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import BoxContainer from "../../sales-executive/ui/BoxContainer";
 
const data = [
  {
    name: "RAJESH R",
    followup: 1500,
    sanctioned: 820,
    disbursed: 1200,
    pending: 600,
    rejected: 520,
  },
  {
    name: "ANITA S",
    followup: 1600,
    sanctioned: 900,
    disbursed: 1300,
    pending: 550,
    rejected: 480,
  },
  {
    name: "MICHAEL T",
    followup: 1550,
    sanctioned: 850,
    disbursed: 1250,
    pending: 580,
    rejected: 500,
  },
  {
    name: "EMMA L",
    followup: 1580,
    sanctioned: 880,
    disbursed: 1280,
    pending: 600,
    rejected: 520,
  },
  {
    name: "LIAM J",
    followup: 1520,
    sanctioned: 840,
    disbursed: 1220,
    pending: 570,
    rejected: 490,
  },
  {
    name: "SOFIA P",
    followup: 1600,
    sanctioned: 900,
    disbursed: 1300,
    pending: 600,
    rejected: 520,
  },
  {
    name: "CARLOS M",
    followup: 1550,
    sanctioned: 860,
    disbursed: 1260,
    pending: 580,
    rejected: 500,
  },
  {
    name: "OLIVIA W",
    followup: 1580,
    sanctioned: 890,
    disbursed: 1290,
    pending: 590,
    rejected: 510,
  },
  {
    name: "ZOE K",
    followup: 1600,
    sanctioned: 900,
    disbursed: 1300,
    pending: 600,
    rejected: 520,
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Followup</span>
            </div>
            <span className="font-semibold">{payload[0].value}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Sanctioned</span>
            </div>
            <span className="font-semibold">{payload[1].value} | ₹XX,XXX</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Disbursed</span>
            </div>
            <span className="font-semibold">{payload[2].value} | ₹XX,XXX</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Pending Disbursal</span>
            </div>
            <span className="font-semibold">{payload[3].value} | ₹XX,XXX</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span>Rejected</span>
            </div>
            <span className="font-semibold">{payload[4].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface LeadFunnelOverviewProps {
  data?: any[];
  loading?: boolean;
  error?: string | null;
}

const LeadFunnelOverview = ({ data: propData, loading, error }: LeadFunnelOverviewProps = {}) => {
  const chartData = propData ?? data;

  if (error) {
    return (
      <BoxContainer title="Lead Funnel Overview (Across Employee)" childrenClassName="w-full block">
        <div className="flex items-center justify-center h-40 text-red-500 text-sm">{error}</div>
      </BoxContainer>
    );
  }

  if (loading) {
    return (
      <BoxContainer title="Lead Funnel Overview (Across Employee)" childrenClassName="w-full block">
        <div className="animate-pulse w-full h-80 bg-gray-200 rounded" />
      </BoxContainer>
    );
  }
  return (
    <BoxContainer title="Lead Funnel Overview (Across Employee)" childrenClassName="w-full block">
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar dataKey="followup" fill="#3B82F6" name="Followup Leads" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sanctioned" fill="#8B5CF6" name="Sanctioned" radius={[4, 4, 0, 0]} />
            <Bar dataKey="disbursed" fill="#10B981" name="Disbursed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="#F59E0B" name="Pending Disbursal" radius={[4, 4, 0, 0]} />
            <Bar dataKey="rejected" fill="#F87171" name="Rejected" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </BoxContainer>
  );
};

export default LeadFunnelOverview;
