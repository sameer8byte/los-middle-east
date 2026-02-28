import React, { useRef } from 'react';
import { HiOutlineCalendar, HiChevronDown } from 'react-icons/hi';

interface DashboardHeaderProps {
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    startDate,
    setStartDate,
    endDate,
    setEndDate,
}) => {
    const startInputRef = useRef<HTMLInputElement>(null);
    const endInputRef = useRef<HTMLInputElement>(null);

    const handleOpenPicker = (ref: React.RefObject<any>) => {
        if (ref.current) {
            if (typeof ref.current.showPicker === 'function') {
                ref.current.showPicker();
            } else {
                ref.current.click();
            }
        }
    };

    return (
        <header className="flex items-center justify-between px-4 py-2   w-full">
            <div>
                <h1 className="text-lg font-bold text-gray-800 leading-[22px]">
                    Dashboard
                </h1>
                <p className="text-[14px] text-gray-400 font-medium leading-[22px]">
                    Overview of loans, disbursements, and collections
                </p>
            </div>

            <div className="flex items-center gap-2">
                {/* Start Date Card */}
                <div
                    onClick={() => handleOpenPicker(startInputRef)}
                    className="relative flex items-center border border-gray-200 rounded-md bg-white hover:border-blue-400 transition-colors cursor-pointer h-10"
                >
                    <HiOutlineCalendar className="absolute left-2 text-black-500 text-sm pointer-events-none z-10" />
                    <input
                        ref={startInputRef}
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="pl-7 pr-2 py-1 text-[11px] font-medium text-gray-600 flex items-center min-w-[100px] h-full pointer-events-none justify-between">
                        <span>{startDate || "Start Date"}</span>
                        <HiChevronDown className="text-gray-400 text-sm ml-1" />
                    </div>
                </div>

                {/* End Date Card */}
                <div
                    onClick={() => handleOpenPicker(endInputRef)}
                    className="relative flex items-center border border-gray-200 rounded-md bg-white hover:border-blue-400 transition-colors cursor-pointer h-10"
                >
                    <HiOutlineCalendar className="absolute left-2 text-black-500 text-sm pointer-events-none z-10" />
                    <input
                        ref={endInputRef}
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="pl-7 pr-2 py-1 text-[11px] font-medium text-gray-600 flex items-center min-w-[100px] h-full pointer-events-none justify-between">
                        <span>{startDate || "Start Date"}</span>
                        <HiChevronDown className="text-gray-400 text-sm ml-1" />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;