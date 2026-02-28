import BoxContainer from "../../ui/BoxContainer";
// import PerformanceScore from "../PerformanceScore";
PerformanceScore
import QualitativeFeedback from "./QualitativeFeedback";
import PerformanceScore from "./PerformanceScore";

const PerformanceAnalysis = () => { 
    return (
        <div className="bg-white h-full">
            <BoxContainer title="Performance Analysis" className="h-full">
            <div className="py-2 w-full flex justify-between items-center border-b border-gray-200 mb-2">
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