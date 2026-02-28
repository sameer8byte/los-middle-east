import { useEffect, useState, useRef } from "react";
import { useAppSelector } from "../../../redux/store";
import {
  AddressProofEnum,
  AlternateAddress,
  ResidenceTypeEnum,
} from "../../../types/user-details";
import { FiCheckCircle, FiAlertCircle, FiSave } from "react-icons/fi";
import {
  getAlternateAddress,
  updateAlternateAddress,
} from "../../../services/api/user-details.api";
 import {
  findBestMatchingState,
  IndianStatesWithCapitals,
} from "../../../utils/utils";
import AlternateAddDocument from "./alternateAddDocument";
   
export function Alternate() {
  const user = useAppSelector((state) => state.user.user);
  const userDetails = useAppSelector((state) => state.userDetails);
  const initialFormDataRef = useRef<Partial<AlternateAddress>>({});

  const [alternateAddressId, setAlternateAddressId] = useState<string | null>(
    null
  );
  const [addressProofType, setAddressProofType] =
    useState<AddressProofEnum | null>(AddressProofEnum.POSTPAID_BILL);
  const [filePrivateKey, setFilePrivateKey] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<AlternateAddress>>({
    address: "",
    city: "",
    state: "",
    pincode: "",
    residenceType: ResidenceTypeEnum.OWNED,
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchAlternateAddress = async () => {
      try {
        if (user?.id) {
          const response = await getAlternateAddress(user.id);
          if (!response) return;
          const matchedState = findBestMatchingState(
            response?.state,
            IndianStatesWithCapitals
          );
          const newFormData = {
            address: response?.address || "",
            city: response?.city || "",
            state: matchedState?.value || "",
            pincode: response?.pincode || "",
            residenceType: response?.residenceType || ResidenceTypeEnum.OWNED,
          };
          setAlternateAddressId(response?.id);
          setAddressProofType(
            response?.addressProofType || AddressProofEnum.POSTPAID_BILL
          );
          setFilePrivateKey(response?.filePrivateKey || null);
          setFormData(newFormData);
          initialFormDataRef.current = newFormData;
        }
      } catch (error) {
        console.error("Error fetching alternate address:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlternateAddress();
  }, [user?.id]);

  const hasChanges = () => {
    return (
      JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current)
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges() || !user?.id) return;

    setIsSaving(true);
    try {
      const response = await updateAlternateAddress(user.id, {
        ...formData,
        userId: user.id,
      });

      if (!response) {
        throw new Error("Failed to update alternate address");
      }
      setAlternateAddressId(response.id);
      setAddressProofType(
        response.addressProofType || AddressProofEnum.POSTPAID_BILL
      );
      setFilePrivateKey(response.filePrivateKey || null);
      // Update formData with the response data
      setFormData({
        address: response.address || "",
        city: response.city || "",
        state: response.state || "",
        pincode: response.pincode || "",
        residenceType: response.residenceType || ResidenceTypeEnum.OWNED,
      });
      initialFormDataRef.current = formData;
      setSaveStatus({ type: "success", message: "Address saved successfully" });
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: (error as Error).message || "Failed to save address changes",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (userDetails?.isCommunicationAddress) return null;
  if (loading)
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );

  return (
    <div className="bg-white shadow-lg rounded-brand p-6 border border-gray-100 mt-4 relative">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Alternate Address</h2>
        <p className="mt-2 text-gray-600">
          Provide an alternate shipping address if different from your primary
          location
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {saveStatus && (
          <div
            className={`p-4 rounded-brand flex items-center space-x-3 ${
              saveStatus.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {saveStatus.type === "success" ? (
              <FiCheckCircle className="w-5 h-5" />
            ) : (
              <FiAlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{saveStatus.message}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            placeholder="123 Main St"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-brand border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="New York"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-brand border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="pincode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Postal Code
            </label>
            <input
              id="pincode"
              name="pincode"
              type="text"
              placeholder="10001"
              value={formData.pincode}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-brand border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              State
            </label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-brand focus:ring-2 focus:ring-primary focus:border-transparent transition pr-10"
            >
              <option value="" disabled>
                Select a state
              </option>
              {IndianStatesWithCapitals.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="residenceType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Residence Type
            </label>
            <select
              id="residenceType"
              name="residenceType"
              value={formData.residenceType}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-brand border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              {Object.values(ResidenceTypeEnum).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="py-3 border-b border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={!hasChanges() || isSaving}
            className={`inline-flex items-center px-6 py-3 rounded-brand font-medium transition-all ${
              hasChanges()
                ? "bg-primary text-on-primary hover:bg-primary-hover"
                : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
            } ${isSaving ? "opacity-75 cursor-wait" : ""}`}
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-5 h-5 mr-2" />
                Save
              </>
            )}
          </button>
        </div>
      </form>
      {alternateAddressId && (
        <AlternateAddDocument
          filePrivateKey={filePrivateKey || ""}
          alternateAddressId={alternateAddressId}
          addressProofType={addressProofType}
          setFilePrivateKey={setFilePrivateKey}
          setAddressProofType={setAddressProofType}
          setAlternateAddressId={setAlternateAddressId}
        />
      )}
    </div>
  );
}
