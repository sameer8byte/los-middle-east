import { useState } from "react";
import { FiPlus, FiSearch, FiFilter } from "react-icons/fi";
import ExecutivePerformanceCard from "./ExecutivePerformanceCard";
import BoxContainer from "../../../sales-executive/ui/BoxContainer";

// AddRatingModal Component
interface AddRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Executive {
  id: string;
  name: string;
}

const AddRatingModal = ({ isOpen, onClose }: AddRatingModalProps) => {
  const [selectedExecutive, setSelectedExecutive] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");

  const executives: Executive[] = [
    { id: "1", name: "Mahesh R" },
    { id: "2", name: "Kiran T" },
    { id: "3", name: "Jasmine L" },
    { id: "4", name: "Tariq M" },
    { id: "5", name: "Anita S" },
    { id: "6", name: "Rajesh K" },
  ];

  const handleSubmit = async () => {
    if (!selectedExecutive || !selectedRating) {
      alert("Please select an executive and rating");
      return;
    }
    console.log("Rating submitted:", { selectedExecutive, selectedRating, comments });
    onClose();
  };

  const handleCancel = () => {
    setSelectedExecutive("");
    setSelectedRating(null);
    setComments("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 flex items-center justify-center rounded-lg"
      style={{ zIndex: 50, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl"
        style={{ width: '308px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: 'linear-gradient(270deg, #2388FF 0%, #155299 100%)' }}
        >
          <div 
            className="bg-white rounded-full flex items-center justify-center"
            style={{ width: '24px', height: '24px' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10.163 5.38L15 6.12L11.5 9.545L12.326 14.36L8 12.09L3.674 14.36L4.5 9.545L1 6.12L5.837 5.38L8 1Z" fill="#2388FF"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">Add Rating</h2>
        </div>

        <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Select Executive <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ height: '40px' }}
            >
              <option value="">Select Executive</option>
              {executives.map((exec) => (
                <option key={exec.id} value={exec.id}>
                  {exec.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Attribute 1
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  className={`flex items-center justify-center text-sm font-semibold rounded transition-all ${
                    selectedRating && rating <= selectedRating
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ width: '24px', height: '24px' }}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Add Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ height: '120px' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

const TeamPerformance = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
    return (
        <BoxContainer 
            title="Team Performance" 
            className="mb-0 min-h-[500px] overflow-auto relative"
            childrenClassName="flex-col"
            button={
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
                >
                    Add Rating <FiPlus className="w-4 h-4" />
                </button>
            }
            >
                <div className="w-full h-[880px] overflow-y-auto scrollbar-hide">
                    {/* Reporting Manager */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 -mx-4 px-4">
                        <span className="text-sm font-medium text-gray-600">Reporting Manager</span>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-pink-300 flex items-center justify-center text-white text-xs font-semibold">
                                RK
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">Rajesh K</span>
                                <span className="text-gray-500"> | Sales Head</span>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Executive Name"
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <button className="p-2 border border-gray-300 rounded-lg">
                            <FiFilter className="w-5 h-5 text-gray-600" />
                        </button>
                        <button className="p-2 border border-gray-300 rounded-lg">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                        </button>
                    </div>

                    {/* Executive Cards */}
                    <div className="space-y-2">
                        <ExecutivePerformanceCard
                            name="Mahesh R"
                            initials="MR"
                            rank={3}
                            score={8.25}
                            bgColor="#E91E63"
                            expanded={true}
                        />
                        <ExecutivePerformanceCard
                            name="Kiran T"
                            initials="KR"
                            rank={6}
                            score={7.60}
                            bgColor="#9C27B0"
                        />
                        <ExecutivePerformanceCard
                            name="Jasmine L"
                            initials="JR"
                            rank={7}
                            score={7.45}
                            bgColor="#FF5722"
                        />
                        <ExecutivePerformanceCard
                            name="Tariq M"
                            initials="TR"
                            rank={8}
                            score={7.30}
                            bgColor="#E91E63"
                        />
                    </div>
                </div>
                <AddRatingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </BoxContainer>
    );
};

export default TeamPerformance;
