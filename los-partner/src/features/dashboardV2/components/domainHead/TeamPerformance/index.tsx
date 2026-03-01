import React from 'react';
import {
  EmployeeSnapshot,
  AverageRating,
  SystemAttribute,
  EmployeeAttribute,
  TopExecutives,
  Manager,
  PerformanceTable,
} from './components';

const TeamPerformance: React.FC = () => {
  return (
    <div className="p-6 space-y-6" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Employee Snapshot */}
      <EmployeeSnapshot />

      {/* Rating Cards Row - Fixed width cards side by side */}
      <div className="flex gap-6" style={{ maxWidth: '1230px' }}>
        <AverageRating />
        <SystemAttribute />
        <EmployeeAttribute />
      </div>

      {/* Top Performers and Manager Performance */}
      <div className="flex gap-6" style={{ maxWidth: '1230px' }}>
        <TopExecutives />
        <Manager />
      </div>

      {/* Performance Table */}
      <PerformanceTable />
    </div>
  );
};

export default TeamPerformance;
