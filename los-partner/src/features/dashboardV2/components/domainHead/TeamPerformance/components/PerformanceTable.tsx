import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import SalesPerformance from './SalesPerformance';
import CreditPerformance from './CreditPerformance';
import CollectionPerformance from './CollectionPerformance';

const PerformanceTable: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'credit' | 'collection'>('sales');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabs = [
    { id: 'sales' as const, label: 'Sales' },
    { id: 'credit' as const, label: 'Credit' },
    { id: 'collection' as const, label: 'Collection' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ maxWidth: '1230px' }}>
      {/* Header - Always visible */}
      <div 
        className="bg-[#F5F5F5] px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-semibold text-gray-900">Performance Table (Managers & Executives)</h3>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <div className="flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(tab.id);
                  }}
                  className={`px-4 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {isExpanded ? (
            <FiChevronUp size={20} className="text-gray-600" />
          ) : (
            <FiChevronDown size={20} className="text-gray-600" />
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-6">
          {/* Tab Content */}
          <div className="mb-6">
            {activeTab === 'sales' && <SalesPerformance />}
            {activeTab === 'credit' && <CreditPerformance />}
            {activeTab === 'collection' && <CollectionPerformance />}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">1–50 of 2,619</span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronLeft size={16} className="text-gray-600" />
              </button>
              <button className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100">
                <FiChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTable;
