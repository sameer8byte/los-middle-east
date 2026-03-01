import { useState, useRef, useEffect } from "react";
import BoxContainer from "../../ui/BoxContainer";
// import PerformanceScore from "../PerformanceScore";
PerformanceScore
import QualitativeFeedback from "./QualitativeFeedback";
import PerformanceScore from "./PerformanceScore";
import { HiChevronDown } from "react-icons/hi";
import { BiPieChart } from "react-icons/bi";

const PerformanceAnalysis = () => {
    const [showManagerFilter, setShowManagerFilter] = useState(false);
    const [selectedManager, setSelectedManager] = useState("all");
    const managerFilterRef = useRef<HTMLDivElement>(null);

    const managers = [
        { id: "all", name: "All Managers" },
        { id: "1", name: "Rajesh K | Sales Manager" },
        { id: "2", name: "Priya S | Sales Manager" },
        { id: "3", name: "Amit P | Sales Manager" },
        { id: "4", name: "Neha M | Sales Manager" },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (managerFilterRef.current && !managerFilterRef.current.contains(event.target as Node)) {
                setShowManagerFilter(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedManagerName = managers.find(m => m.id === selectedManager)?.name || "Select Manager";
    return (
        <div className="bg-white h-full">
            <BoxContainer title="Performance Analysis" className="h-full" titleBgColor="bg-[#f5f5f5]" isIcon={true} icon={<BiPieChart className="w-5 h-5" />} dropdown={
                <div className="relative" ref={managerFilterRef}>
                    <button 
                        onClick={() => setShowManagerFilter(!showManagerFilter)}
                        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                        {selectedManagerName}
                        <HiChevronDown className="w-4 h-4" />
                    </button>
                    {showManagerFilter && (
                        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            {managers.map((manager) => (
                                <button
                                    key={manager.id}
                                    onClick={() => {
                                        setSelectedManager(manager.id);
                                        setShowManagerFilter(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                                        selectedManager === manager.id ? "bg-blue-50 font-semibold text-blue-600" : "text-gray-700"
                                    }`}
                                >
                                    {manager.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            }>
            <div className=" w-full flex justify-between items-center border-b border-gray-200 mb-2">
                <h2>Reporting Manager</h2>
                <p>RK Rajesh K | Sales Manager</p>
            </div>
                <PerformanceScore />
                <QualitativeFeedback/>
            </BoxContainer>
        </div>  
    )
}

export default PerformanceAnalysis;