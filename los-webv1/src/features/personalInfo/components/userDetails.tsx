import React, { useEffect, useState, useRef } from "react";
import {
  GenderEnum,
  MaritalStatusEnum,
  ReligionEnum,
  ResidenceTypeEnum,
} from "../../../types/user-details";

import { useAppDispatch, useAppSelector } from "../../../redux/store";
import dayjs from "dayjs";
import { FiCheckCircle, FiAlertCircle, FiLock } from "react-icons/fi";
import { updatePersonalDetails } from "../../../services/api/user-details.api";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import { debounce } from "lodash";
import {
  findBestMatchingState,
  IndianStatesWithCapitals,
} from "../../../utils/utils";
import LoadingSpinner from "../../../common/ui/loadingSpinner";
import { camelOrSnakeToTitle } from "../../../utils/camelOrSnakeToTitle";

const UserDetails = () => {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.user);
  const userDetails = useAppSelector((state) => state.userDetails);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    gender: GenderEnum.MALE,
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    maritalStatus: MaritalStatusEnum.SINGLE,
    religion: ReligionEnum.HINDUISM,
    spouseName: "",
    fathersName: "",
    isCommunicationAddress: true,
    filePrivateKey: "",
    residenceType: ResidenceTypeEnum.RENTED,
  });
  const initialFormDataRef = useRef<typeof formData | null>(null);
  const formDataRef = useRef(formData);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Initialize form data
  useEffect(() => {
    if (userDetails) {
      const matchedState = findBestMatchingState(
        userDetails.state,
        IndianStatesWithCapitals
      );

      const newFormData = {
        firstName: userDetails.firstName || "",
        lastName: userDetails.lastName || "",
        gender: userDetails.gender || GenderEnum.MALE,
        dateOfBirth: userDetails.dateOfBirth
          ? dayjs(userDetails.dateOfBirth).format("YYYY-MM-DD")
          : "",
        middleName: userDetails.middleName || "",
        address: userDetails.address || "",
        city: userDetails.city || "",
        state: matchedState?.value || "",
        pincode: userDetails.pincode || "",
        maritalStatus: userDetails.maritalStatus || MaritalStatusEnum.SINGLE,
        religion: userDetails.religion || ReligionEnum.HINDUISM,
        spouseName: userDetails.spouseName || "",
        fathersName: userDetails.fathersName || "",
        isCommunicationAddress: userDetails.isCommunicationAddress ?? true,
        residenceType: userDetails.residenceType || ResidenceTypeEnum.RENTED,
        filePrivateKey: userDetails.filePrivateKey || "",
      };

      setFormData(newFormData);
      initialFormDataRef.current = newFormData;
      formDataRef.current = newFormData;
    }
  }, [userDetails]);

  // Update formData ref whenever formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Debounced save function
  const debouncedSave = useRef(
    debounce(() => {
      handleSave(formDataRef.current);
    }, 2000)
  ).current;

  // Cleanup debounce
  useEffect(() => {
    return () => debouncedSave.cancel();
  }, []);

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Trim leading spaces for address field
    const processedValue = name === "address" ? value.trimStart() : value;

    setFormData((prev) => {
      const newData = { ...prev, [name]: processedValue };
      setDirtyFields((prev) => new Set([...prev, name]));
      return newData;
    });
    debouncedSave();
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      handleSave(newData);
      return newData;
    });
    setDirtyFields((prev) => new Set([...prev, name]));
  };

  const handleImmediateChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, type } = e.target;
    const value =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      setDirtyFields((prev) => new Set([...prev, name]));
      handleSave(newData);
      return newData;
    });
  };

  const handleSave = async (currentFormData: typeof formData) => {
    const isDirty =
      JSON.stringify(currentFormData) !==
      JSON.stringify(initialFormDataRef.current);

    if (!isDirty || !userDetails?.id) {
      setDirtyFields(new Set());
      return;
    }

    setIsSaving(true);
    try {
      const response = await updatePersonalDetails(
        userData.user.userDetailsId,
        {
          ...currentFormData,
          dateOfBirth: new Date(currentFormData.dateOfBirth),
        }
      );

      dispatch(updateUserDetails(response));
      initialFormDataRef.current = currentFormData;
      setDirtyFields(new Set());
      setSaveStatus({ type: "success", message: "Changes saved successfully" });
    } catch (error) {
      setSaveStatus({ type: "error", message: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {saveStatus && (
        <div
          className={`mb-6 p-4 rounded-brand flex items-center space-x-3 ${
            saveStatus.type === "success"
              ? "bg-success-light text-success"
              : "bg-error-light text-error"
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

      <div className="space-y-8 ">
        {/* Basic Information Section */}
        <section className=" shadow-lg border border-gray-200 rounded-brand p-6 bg-white relative">
          <h3 className="text-2xl font-semibold text-[var(--color-primary)] text-heading mb-6">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Read-only Fields */}
            {["firstName", "lastName", "dateOfBirth", "middleName"].map(
              (field) => (
                <div key={field} className="relative">
                  <label className="block text-sm font-medium text-label mb-2">
                    {camelOrSnakeToTitle(field.split(/(?=[A-Z])/).join(" "))}
                  </label>

                  <input
                    type={field === "dateOfBirth" ? "date" : "text"}
                    name={field}
                    readOnly
                    value={String(formData[field as keyof typeof formData])}
                    className="w-full px-4 py-2.5 border border-muted rounded-brand bg-gray-200 cursor-not-allowed text-gray-600 font-medium"
                  />

                  <div className="absolute inset-y-0 mt-6 right-3 flex items-center pointer-events-none text-muted">
                    <FiLock className="text-xl" />
                  </div>
                </div>
              )
            )}

            {["gender", "religion"].map((field) => (
              <div key={field} className="relative mt-7 ">
                <label className="block text-sm font-medium text-label mb-2">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <select
                  name={field}
                  value={String(formData[field as keyof typeof formData])}
                  onChange={handleImmediateChange}
                  className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus transition pr-10"
                >
                  {Object.values(
                    field === "gender" ? GenderEnum : ReligionEnum
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {dirtyFields.has(field) && <LoadingSpinner />}
              </div>
            ))}
          </div>
        </section>

        {/* Family Information Section */}
        <section className=" mt-4  shadow-lg border border-gray-200 rounded-brand p-6 bg-white relative">
          <h3 className="text-lg text-[var(--color-primary)] font-semibold text-heading mb-6">
            Family Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-label mb-2">
                Marital Status
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleImmediateChange}
                className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus transition pr-10"
              >
                {Object.values(MaritalStatusEnum).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {dirtyFields.has("maritalStatus") && <LoadingSpinner />}
            </div>

            {formData.maritalStatus === MaritalStatusEnum.MARRIED && (
              <div className="relative">
                <label className="block text-sm font-medium text-label mb-2">
                  Spouse Name
                </label>
                <input
                  type="text"
                  name="spouseName"
                  value={formData.spouseName}
                  onChange={handleTextInputChange}
                  className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus"
                />
                {dirtyFields.has("spouseName") && <LoadingSpinner />}
              </div>
            )}

            <div className="relative">
              <label className="block text-sm font-medium text-label mb-2">
                Father's Name
              </label>
              <input
                type="text"
                name="fathersName"
                value={formData.fathersName}
                onChange={handleTextInputChange}
                className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus"
              />
              {dirtyFields.has("fathersName") && <LoadingSpinner />}
            </div>
          </div>
        </section>

        {/* Address Information Section */}
        <section className=" shadow-lg border border-gray-200 rounded-brand p-6 bg-white  mt-4 relative">
          <h3 className="text-lg text-[var(--color-primary)] font-semibold text-heading mb-6">
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-label mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleTextInputChange}
                className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus"
              />
              {dirtyFields.has("address") && <LoadingSpinner />}
            </div>

            {["city", "pincode"].map((field) => (
              <div key={field} className="relative">
                <label className="block text-sm font-medium text-label mb-2">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="text"
                  name={field}
                  value={String(formData[field as keyof typeof formData])}
                  onChange={handleTextInputChange}
                  className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus"
                />
                {dirtyFields.has(field) && <LoadingSpinner />}
              </div>
            ))}

            <div className="relative">
              <label className="block text-sm font-medium text-label mb-2">
                State
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleStateChange}
                className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus transition pr-10"
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
              {dirtyFields.has("state") && <LoadingSpinner />}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-label mb-2">
                Residence Type
              </label>
              <select
                name="residenceType"
                value={formData.residenceType}
                onChange={handleImmediateChange}
                className="w-full px-4 py-2.5 border border-muted rounded-brand focus:ring-2 focus:ring-primary-focus transition pr-10"
              >
                {Object.values(ResidenceTypeEnum).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {dirtyFields.has("residenceType") && <LoadingSpinner />}
            </div>

            <div className="md:col-span-2">
              <label className="relative inline-flex items-center mt-2">
                <input
                  type="checkbox"
                  name="isCommunicationAddress"
                  checked={formData.isCommunicationAddress}
                  onChange={handleImmediateChange}
                  className="mt-1 w-4 h-4 accent-primary text-primary border-outline rounded focus:ring-primary-focus"
                />
                <span className="ml-3 text-sm text-label">
                  Use this as communication address
                </span>
              </label>
            </div>
          </div>
        </section>
      </div>

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-surface px-4 py-2 rounded-full shadow-md flex items-center space-x-2 text-sm text-label">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Saving changes...</span>
        </div>
      )}
    </div>
  );
};

export default UserDetails;
