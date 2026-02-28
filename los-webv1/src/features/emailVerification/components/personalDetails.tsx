import { useState, useEffect, useRef } from "react";
import { updateUserDetails } from "../../../redux/slices/userDetails";
import { useAppSelector, useAppDispatch } from "../../../redux/store";
import {
  getPersonalDetails,
  updatePersonalDetails,
  updateUserGeolocation,
} from "../../../services/api/user-details.api";
import Dialog from "../../../common/dialog";
import { GeolocationComponent } from "./geoloacation";
import { UserDetails } from "../../../types/user-details";
import { IndianStatesWithCapitals } from "../../../utils/utils";

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function PersonalDetails() {
  const userData = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [showPersonalDetailsForm, setShowPersonalDetailsForm] = useState(false);
  const [showGeolocation, setShowGeolocation] = useState(false);
  const [formData, setFormData] = useState<Partial<UserDetails>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const userDetails = useAppSelector((state) => state.userDetails);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const inputRefs = useRef<
    Record<
      string,
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    >
  >({});
  const fieldOrder = [
    "firstName",
    "middleName",
    "lastName",
    "dateOfBirth",
    "fathersName",
    "address",
    "city",
    "state",
    "pincode",
  ];

  const focusNextField = (currentField: string) => {
    const index = fieldOrder.indexOf(currentField);
    if (index !== -1 && index + 1 < fieldOrder.length) {
      const nextField = fieldOrder[index + 1];
      const nextInput = inputRefs.current[nextField];
      if (nextInput) {
          nextInput.focus();
          nextInput.scrollIntoView({ behavior: "smooth", block: "center" });
        
      }
    }
  };

  // Required fields validation
  const checkRequiredFields = (details: any) => {
    const requiredFields = {
      firstName: "First Name",
      lastName: "Last Name",
      dateOfBirth: "Date of Birth",
      fathersName: "Father's Name",
      address: "Address",
      city: "City",
      state: "State",
      pincode: "Pincode",
    };

    const missing = [];
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!details?.[field] || details[field].toString().trim() === "") {
        missing.push(label);
      }
    }
    return missing;
  };

  // Fetch personal details
  useEffect(() => {
    if (!userData.user?.userDetailsId) {
      return;
    }
    const fetchUserDetails = async () => {
      try {
        const startTime = Date.now();
        const response = await getPersonalDetails(userData.user.userDetailsId);
        const endTime = Date.now();

        // Ensure minimum 2.5s loading delay
        const timeElapsed = endTime - startTime;
        const remainingDelay = 2500 - timeElapsed;
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }

        if (response) {
          dispatch(updateUserDetails(response));

          // Check if required fields are missing
          const missingFields = checkRequiredFields(response);
          if (missingFields.length > 0) {
            setFormData(response);
            setShowPersonalDetailsForm(true);
          } else {
            // Check if it's iOS device
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            if (!response.geoLatitude || !response.geoLongitude) {
              // Skip geolocation for iOS devices
              if (!isIOS) {
                setShowGeolocation(true);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user details:", error);
        setShowPersonalDetailsForm(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userData.user.userDetailsId, dispatch]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim())
      newErrors.firstName = "First Name is required";
    if (!formData.lastName?.trim())
      newErrors.lastName = "Last Name is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of Birth is required";
    if (!formData.fathersName?.trim())
      newErrors.fathersName = "Father's Name is required";
    if (!formData.address?.trim()) newErrors.address = "Address is required";
    if (!formData.city?.trim()) newErrors.city = "City is required";
    if (!formData.state?.trim()) newErrors.state = "State is required";
    if (!formData.pincode?.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Only send the fields that can be updated
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        dateOfBirth: formData.dateOfBirth,
        fathersName: formData.fathersName,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      };

      const response = await updatePersonalDetails(
        userData.user.userDetailsId,
        updateData
      );
      dispatch(updateUserDetails(response));
      setShowPersonalDetailsForm(false);

      // Check if it's iOS device
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (!response.geoLatitude || !response.geoLongitude) {
        // Skip geolocation for iOS devices
        if (!isIOS) {
          setShowGeolocation(true);
        }
      }
    } catch (error) {
      console.error("Failed to save personal details:", error);

      // Better error handling with user-friendly messages
      let errorMessage = "Failed to save details. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as any;
        if (apiError.response?.data?.message) {
          if (Array.isArray(apiError.response.data.message)) {
            errorMessage = "Please check your information and try again.";
          } else {
            errorMessage = apiError.response.data.message;
          }
        }
      }

      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLocationObtained = async (location: GeolocationData) => {
    try {
      await updateUserGeolocation(
        userData.user.userDetailsId,
        location.latitude,
        location.longitude
      );
      const updatedDetails = {
        ...userDetails,
        geoLatitude: location.latitude,
        geoLongitude: location.longitude,
      } as UserDetails;
      dispatch(updateUserDetails(updatedDetails));

      setShowGeolocation(false);
    } catch (error) {
      setShowGeolocation(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <Dialog isOpen={loading} onClose={() => {}} title=""
          hideCloseButton={true}>
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              {/* Simple Spinner */}
              <div className="w-12 h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin mx-auto mb-4"></div>

              <h3 className="text-lg font-semibold text-secondary mb-2">
                Loading Profile
              </h3>
              <p className="text-secondary text-sm">Please wait...</p>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <Dialog
        isOpen={showPersonalDetailsForm}
        onClose={() => {}}
        title="Personal Details"
        description="Please provide your personal information to proceed."
        hideCloseButton={true}
      >
        <div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Personal Information Section */}
              <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary-contrast rounded-md flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-primary-light"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold  text-sm">
                    Personal Information
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Name Fields - Compact Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName || ""}
                        onChange={(e) => {
                          handleInputChange("firstName", e.target.value);
                          if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                              focusNextField("firstName");
                            }
                          }, 2000);
                        }}
                        ref={(el) => {
                          inputRefs.current["firstName"] = el;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " ") e.stopPropagation();
                        }}
                        className={`w-full px-3  text-secondary-active py-2 text-xs border rounded-lg ity-100 focus:border-transparent transition-all duration-200 ${
                          errors.firstName
                            ? "border-error bg-error-light"
                            : "border-gray-200 bg-gray-50 focus:bg-white"
                        }`}
                        placeholder="First name"
                      />

                      {errors.firstName && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        Middle Name{" "}
                        <span className="text-secondary text-xs">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={formData.middleName || ""}
                        onChange={(e) => {
                          handleInputChange("middleName", e.target.value);
                          if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                              focusNextField("middleName");
                            }
                          }, 2000);
                        }}
                        ref={(el) => {
                          inputRefs.current["middleName"] = el;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " ") e.stopPropagation();
                        }}
                        className="w-full px-3 py-2 text-xs border text-secondary-active  border-gray-200 bg-gray-50 rounded-lg ity-50 focus:border-transparent focus:bg-white transition-all duration-200"
                        placeholder="Middle name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName || ""}
                        onChange={(e) => {
                          handleInputChange("lastName", e.target.value);
                          if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                              focusNextField("lastName");
                            }
                          }, 2000);
                        }}
                        ref={(el) => {
                          inputRefs.current["lastName"] = el;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " ") e.stopPropagation();
                        }}
                        className={`w-full px-3 py-2 text-xs text-secondary-active border rounded-lg   transition-all duration-200 ${
                          errors.lastName
                            ? "border-error bg-error-light"
                            : "border-gray-200 bg-gray-50 focus:bg-white"
                        }`}
                        placeholder="Last name"
                      />
                      {errors.lastName && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date of Birth and Father's Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={
                          formData.dateOfBirth
                            ? new Date(formData.dateOfBirth)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          handleInputChange("dateOfBirth", e.target.value);
                          if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                              focusNextField("dateOfBirth");
                            }
                          }, 2000);
                        }}
                        ref={(el) => {
                          inputRefs.current["dateOfBirth"] = el;
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-lg ity-50 focus:border-transparent transition-all duration-200 ${
                          errors.dateOfBirth
                            ? "border-error bg-error-light"
                            : "border-gray-200 bg-gray-50 focus:bg-white"
                        }`}
                      />
                      {errors.dateOfBirth && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.dateOfBirth}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        value={formData.fathersName || ""}
                        onChange={(e) => {
                          handleInputChange("fathersName", e.target.value);
                          if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                              focusNextField("fathersName");
                            }
                          }, 2000);
                        }}
                        ref={(el) => {
                          inputRefs.current["fathersName"] = el;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " ") e.stopPropagation();
                        }}
                        className={`w-full px-3 py-2 text-xs text-secondary-active border rounded-lg  transition-all duration-200 ${
                          errors.fathersName
                            ? "border-error bg-error-light"
                            : "border-gray-200 bg-gray-50 focus:bg-white"
                        }`}
                        placeholder="Father's full name"
                      />
                      {errors.fathersName && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.fathersName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary-contrast rounded-md flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold  text-sm">
                    Address Information
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Address */}
                  <div>
                    <label className="block text-xs font-medium text-secondary-active mb-1.5">
                      Complete Address *
                    </label>
                    <textarea
                      value={formData.address || ""}
                      onChange={(e) => {
                        handleInputChange("address", e.target.value);
                         if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                             focusNextField("address");
                            }
                          }, 2000);
                        
                      }}
                      ref={(el) => {
                        inputRefs.current["addess"] = el;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === " ") e.stopPropagation();
                      }}
                      rows={2}
                      className={`w-full px-3 py-2 text-xs border rounded-lg  resize-none transition-all duration-200 ${
                        errors.address
                          ? "border-error bg-error-light"
                          : "border-gray-200 bg-gray-50 focus:bg-white"
                      }`}
                      placeholder="House/Flat No., Building, Street, Locality"
                    />
                    {errors.address && (
                      <p className="text-error text-xs mt-1 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* City, State, Pincode */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city || ""}
                        onChange={(e) => {
                          handleInputChange("city", e.target.value);
                           if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                             focusNextField("city");
                            }
                          }, 2000);
                          
                        }}
                        ref={(el) => {
                          inputRefs.current["city"] = el;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " ") e.stopPropagation();
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-lg  transition-all duration-200 ${
                          errors.city
                            ? "border-error bg-error-light"
                            : "border-gray-200 bg-gray-50 focus:bg-white"
                        }`}
                        placeholder="Enter city"
                      />
                      {errors.city && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        State *
                      </label>
                      <div className="relative">
                        <select
                          value={formData.state || ""}
                          onChange={(e) => {
                            handleInputChange("state", e.target.value);
                            if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                             focusNextField("state");
                            }
                          }, 2000);
                            
                          }}
                          ref={(el) => {
                            inputRefs.current["state"] = el;
                          }}
                          className={`w-full px-3 py-2 text-xs border rounded-lg  appearance-none bg-white transition-all duration-200 ${
                            errors.state
                              ? "border-error bg-error-light"
                              : "border-gray-200 bg-gray-50 focus:bg-white"
                          }`}
                        >
                          <option value="" className="text-gray-400">
                            Select State
                          </option>
                          {IndianStatesWithCapitals.map((state) => (
                            <option
                              key={state.code}
                              value={state.value}
                              className="text-secondary-active"
                            >
                              {state.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg
                            className="w-3.5 h-3.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                      {errors.state && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.state}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary-active mb-1.5">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        value={formData.pincode || ""}
                        onChange={(e) => {
                          handleInputChange("pincode", e.target.value);
                          if (debounceTimeout.current) {
                            clearTimeout(debounceTimeout.current);
                          }

                          
                          debounceTimeout.current = setTimeout(() => {
                            if (e.target.value.length >= 1) {
                             focusNextField("pincode");
                            }
                          }, 2000);
                         
                        }}
                        ref={(el) => {
                          inputRefs.current["pincode"] = el;
                        }}
                        maxLength={6}
                        className={`w-full px-3 py-2 text-xs border rounded-lg  transition-all duration-200 ${
                          errors.pincode
                            ? "border-error bg-error-light"
                            : "border-gray-200 bg-gray-50 focus:bg-white"
                        }`}
                        placeholder="6-digit pincode"
                      />
                      {errors.pincode && (
                        <p className="text-error text-xs mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.pincode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200  cursor-pointer ${
                  saving
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-primary  text-on-primary  shadow-md hover:shadow-lg active:scale-95"
                } relative overflow-hidden`}
              >
                <div className="relative flex items-center justify-center">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Continue</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* Geolocation Component */}
      {showGeolocation && (
        <GeolocationComponent onLocationObtained={handleLocationObtained} />
      )}
    </div>
  );
}
