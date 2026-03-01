import React from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface RatingData {
    sales: number;
    credit: number;
    collection: number;
    overall: number;
}

interface AvgRatingProps {
    data?: RatingData;
    loading?: boolean;
}

const AverageRating: React.FC<AvgRatingProps> = ({ data, loading }) => {
    const currentData = data ?? {
        sales: 8.4,
        credit: 7.2,
        collection: 6.5,
        overall: 8.4
    };

    const chartData = [
        {
            name: "Collection",
            value: currentData.collection,
            fill: "#ef4444",
        },
        {
            name: "Credit",
            value: currentData.credit,
            fill: "#fbbf24",
        },
        {
            name: "Sales",
            value: currentData.sales,
            fill: "#4ade80",
        },
    ];

    if (loading) {
        return (
            <div 
                className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex items-center justify-center animate-pulse"
                style={{ width: '402px', height: '384px', borderRadius: '20px' }}
            >
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div 
            className="bg-white border border-[#E5E7EB]"
            style={{ width: '402px', height: '384px', borderRadius: '20px', overflow: 'hidden' }}
        >
            <div className="bg-[#F5F5F5] px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Avg Rating (Across Teams)</h3>
            </div>

            <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Overall</div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">Team Performance</div>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-blue-600">{currentData.overall.toFixed(1)}</span>
                        <span className="text-gray-500 text-base">/10</span>
                    </div>
                </div>

                <div className="relative w-full h-[150px] flex justify-center overflow-hidden">
                    <ResponsiveContainer width="100%" height={320}>
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="40%"
                            outerRadius="100%"
                            startAngle={180}
                            endAngle={0}
                            data={chartData}
                            barSize={25}
                        >
                            <PolarAngleAxis
                                type="number"
                                domain={[0, 10]}
                                angleAxisId={0}
                                tick={false}
                            />
                            <RadialBar
                                background={{ fill: "#f3f4f6" }}
                                dataKey="value"
                                cornerRadius={100}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>

                <div className="border-t border-dashed border-gray-300 w-full"></div>

                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', textAlign: 'center', paddingTop: '4px' }}>
                    <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></div>
                            <span className="text-xs text-gray-600">Sales</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{currentData.sales} / 10</p>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></div>
                            <span className="text-xs text-gray-600">Credit</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{currentData.credit} / 10</p>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                            <span className="text-xs text-gray-600">Collection</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{currentData.collection} / 10</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AverageRating;
