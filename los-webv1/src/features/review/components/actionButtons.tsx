import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/store";
import axios from "axios";
import { getDownloadReviewPdf } from "../../../services/api/web.api";
import { patchUpdateOnboardingStep } from "../../../services/api/user.api";
import { updateUserOnboardingStep } from "../../../redux/slices/user";
import { PageIdToPageMap } from "../../../constant/redirect";
import { useGeolocation } from "../../../hooks/useGeoLocations";
import { useIPGeolocation } from "../../../hooks/useIPGeolocation";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiCheck, FiArrowRight, FiAlertCircle, FiCpu, FiActivity, FiShield } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";


export function ActionButtons() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userData = useAppSelector((state) => state.user);
  const userDetails = useAppSelector((state) => state.userDetails);
  // employment data now fetched directly from external API in handleSubmit

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIneligibleModal, setShowIneligibleModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { latitude, longitude } = useGeolocation();
  const location = useIPGeolocation();

  const handleSubmit = async () => {
    if (!userData.user) return;

    console.log("userData", userData);


    try {
      setIsSubmitting(true);
      setError(null);

      // --- Credit Risk Check ---
      try {
        setIsAnalyzing(true);
        // 1. Fetch latest loan, credibility, and external employment data

        const externalEmp = JSON.parse(localStorage.getItem("user_employment") || "{}");

        // Salary conversion (INR to BHD) - Rate 242
        const INR_TO_BHD_RATE = 242;
        const salaryInINR = externalEmp?.salary || 0;
        const salary = Math.round((salaryInINR / INR_TO_BHD_RATE) * 100) / 100;

        const loanAppliedAmount = Math.round((salary * 0.3) * 100) / 100;

        // Normalize data for ML service
        const rawGender = detailsAny?.gender || "MALE";
        const gender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();

        const rawEmploymentType = externalEmp?.employmenttype || "FULL_TIME";
        const employmentTypeMap: Record<string, string> = {
          FULL_TIME: "Salaried",
          SELF_EMPLOYED: "Self-Employed",
          PART_TIME: "Part-Time",
          CONTRACTUAL: "Contractual",
        };
        const employmenttype = employmentTypeMap[rawEmploymentType.toUpperCase()] || rawEmploymentType;

        const joiningDate = externalEmp?.joiningDate
          ? new Date(externalEmp.joiningDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        const payload = {
          salary,
          creditScore: detailsAny?.creditScore || 650,
          loan_applied_amount: loanAppliedAmount,
          "Loan.tenure": 35,
          gender,
          employmenttype,
          loanType: "Personal",
          state: detailsAny?.state || detailsAny?.city || "Bahrain",
          verificationStatus: "Verified",
          accountExists: true,
          is_repeat_loan: false,
          joiningDate,
        };

        console.log(payload);


        const mlResponse = await axios.post(
          `https://apilm.8byte.ai/api/credit_risk`,
          payload,
          { 
            headers: { "Content-Type": "application/json" }
          }
        );

        console.log("Review Page Credit Risk Response:", mlResponse.data);
        
        // Persist assessment result to localStorage
        if (mlResponse.data) {
          localStorage.setItem("credit_risk_assessment", JSON.stringify(mlResponse.data));
        }

        // Check for eligibility structure and block if ineligible
        if (mlResponse.data && mlResponse.data.micro_lending_eligibility) {
          if (!mlResponse.data.micro_lending_eligibility.eligible) {
            setShowIneligibleModal(true);
            setIsSubmitting(false);
            return;
          }
        }
      } catch (mlError: any) {
        console.error("Credit Risk Assessment Error:", mlError);
      } finally {
        setIsAnalyzing(false);
      }
      // --- End Credit Risk Check ---

      const response = await patchUpdateOnboardingStep(
        userData.user.id,
       {
          latitude: latitude||0,
          longitude: longitude||0,
          ipJson: JSON.stringify(location),
       }
      );

      if (response) {
        dispatch(updateUserOnboardingStep(response.onboardingStep));
        navigate(PageIdToPageMap[response.onboardingStep]);
      }
    } catch (err) {
      console.error("Onboarding step update failed:", err);
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await getDownloadReviewPdf(userData.user.id);

      if (response) {
        const link = document.createElement("a");
        link.target = "_blank";
        link.href = response.url;
        link.setAttribute("download", "review.pdf");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const detailsAny = userDetails as any;

  return (
    <div className="">
      {showIneligibleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl transform animate-scale-up border border-red-100">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiAlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Application Paused</h3>
              <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                Sorry, you are not eligible for a loan at this time based on our risk assessment.
                <span className="block mt-4 text-red-600 font-bold bg-red-50 py-2 rounded-xl border border-red-100 italic">
                  Please try again after 60 days.
                </span>
              </p>
              <button
                onClick={() => {
                  setShowIneligibleModal(false);
                  navigate("/");
                }}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 group relative overflow-hidden bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-6 py-4 transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-3">
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiDownload className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
            )}
            <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              {isDownloading ? "Downloading..." : "Download PDF"}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -skew-x-12 translate-x-full group-hover:translate-x-[-200%]"></div>
        </button>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 py-4 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex items-center justify-center gap-3">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span className="font-semibold">Submit Application</span>
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -skew-x-12 translate-x-full group-hover:translate-x-[-200%]"></div>
        </button>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          By submitting, you agree to our terms and conditions
        </p>
      </div>

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {isAnalyzing && <AIAnalysisModal />}
      </AnimatePresence>
    </div>
  );
}

function AIAnalysisModal() {
  const [statusIndex, setStatusIndex] = useState(0);
  const statuses = [
    "Initializing AI Risk Models...",
    "Scanning Employment History...",
    "Analyzing Salary Stability...",
    "Cross-referencing Global Datasets...",
    "Calibrating Financial Credibility...",
    "Generating Final Assessment...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-md"
    >
      <div className="relative max-w-md w-full text-center">
        {/* Glowing Background Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        
        {/* Animated AI Brain/CPU Core */}
        <div className="relative mb-8">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-32 h-32 mx-auto rounded-full border-2 border-blue-400/30 flex items-center justify-center"
          >
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-500/50 animate-spin-slow" />
          </motion.div>
          
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <FiCpu className="w-12 h-12 text-blue-400" />
          </motion.div>

          {/* Scanning Line */}
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)] z-10"
          />
        </div>

        {/* AI Agent Identity */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="flex gap-1">
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1 h-1 bg-blue-400 rounded-full" />
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 bg-blue-400 rounded-full" />
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 bg-blue-400 rounded-full" />
          </div>
          <span className="text-blue-400 text-xs font-mono tracking-widest uppercase">8Byte AI Engine Alpha</span>
        </div>

        {/* Dynamic Status Text */}
        <div className="h-8 overflow-hidden mb-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-xl font-bold text-white tracking-tight"
            >
              {statuses[statusIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Technical HUD Details */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 px-4">
          <div className="text-center">
            <FiActivity className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Neural Load</p>
            {/* <p className="text-xs font-mono text-blue-300">84.2%</p> */}
          </div>
          <div className="text-center">
            <FiShield className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Data Security</p>
            {/* <p className="text-xs font-mono text-green-400">AES-256</p> */}
          </div>
          <div className="text-center">
            <FiActivity className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">No Latencies</p>
            {/* <p className="text-xs font-mono text-blue-300">12ms</p> */}
          </div>
        </div>

        {/* Loading Bar Container */}
        <div className="mt-8 px-8">
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}