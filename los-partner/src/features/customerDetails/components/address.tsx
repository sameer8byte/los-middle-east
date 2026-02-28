import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Dialog from "../../../common/dialog";
import {
  AddressProofEnum,
  PartnerUserPermissionType,
} from "../../../constant/enum";
import { usePermission } from "../../../context/permissionContext";
import {
  getCustomerAddresses,
  addCustomerAddress,
  verifyMobileWithService,
  verifyMobileBatch,
  checkIpAddressAssociation
} from "../../../shared/services/api/customer.api";
import { Button } from "../../../common/ui/button";
import { indianStatesWithCapitals } from "../../../constant/stateCode";
import {FaCheckCircle,FaExclamationTriangle } from "react-icons/fa";

function AddressSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-2 pb-2 border-b">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="grid gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-3"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
              <div className="h-4 w-24 bg-gray-100 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 rounded"></div>
              <div className="h-3 w-3/4 bg-gray-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressCard({
  addresses,
}: {
  addresses: {
    type: string;
    address: string;
    createdAt?: Date;
    remarks?: string;
  }[];
}) {
  if (!addresses?.length) return null;

  const formatTimestamp = (date: Date | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="grid gap-3">
      {addresses.map((item, index) => (
        <div
          key={`${item.type}-${item.address}-${index}`}
          className="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex justify-between items-start gap-3 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-primary border border-primary bg-primary/10">
              {item.type}
            </span>
            {item.createdAt && (
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formatTimestamp(item.createdAt)}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            {item.address}
          </p>

          {item.remarks && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
              <svg
                className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-gray-600 leading-relaxed">
                {item.remarks}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MobileVerificationCard({ 
  data, 
  type,
  isLoading = false,
  error = null
}: { 
  data: any;
  type: string;
  isLoading?: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-100 rounded"></div>
            <div className="h-3 w-3/4 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-red-800">Verification Failed</p>
        </div>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <svg
          className="w-8 h-8 text-gray-400 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const getAddressesFromResponse = (responseData: any, serviceType: string) => {
    if (!responseData) return [];

    switch (serviceType) {
      case 'MOBILE_TO_ADDRESSES':
        // Handle both API and cache structures
        if (responseData.addresses && Array.isArray(responseData.addresses)) {
          return responseData.addresses.map((addr: any) => ({
            type: `Address`,
            address: addr.address || addr.fullAddress,
            lastSeenDate: addr.lastSeenDate,
          }));
        }
        return [];
      
      case 'MOBILE_TO_ADDRESSES_ECOM':
        // Handle both API and cache structures
        if (responseData.addresses && Array.isArray(responseData.addresses)) {
          return responseData.addresses.map((addr: any) => ({
            type: `Ecom Address`,
            address: addr.address || `${addr.line1 || ''} ${addr.line2 || ''}, ${addr.city || ''}, ${addr.state || ''}, ${addr.pincode || ''}, ${addr.country || ''}`.trim().replace(/ ,/g, ','),
            lastSeenDate: addr.lastSeenDate || addr.last_delivery_date,
          }));
        }
        return [];
      
      case 'MOBILE_TO_LPG_DETAILS':
        // Handle both API (array) and cache (object with addresses array) structures
        let lpgAddresses = [];
        if (Array.isArray(responseData)) {
          // API response structure
          lpgAddresses = responseData;
        } else if (responseData.addresses && Array.isArray(responseData.addresses)) {
          // Cache response structure
          lpgAddresses = responseData.addresses;
        }
        
        return lpgAddresses.map((lpg: any) => ({
          type: `LPG Address`,
          address: lpg.address,
          provider: lpg.provider,
          name: lpg.name,
        }));
      
      case 'MOBILE_TO_DL_ADVANCED':
        // Handle both API and cache structures
        let dlAddresses = [];
        
        if (responseData.user_address && Array.isArray(responseData.user_address)) {
          // API response structure
          dlAddresses = responseData.user_address;
        } else if (responseData.addresses && Array.isArray(responseData.addresses)) {
          // Cache response structure  
          dlAddresses = responseData.addresses;
        }
        
        return dlAddresses.map((addr: any) => ({
          type: `Driving License - ${addr.type || 'Address'}`,
          address: addr.completeAddress || addr.address,
          state: addr.state,
          pincode: addr.pin || addr.pincode,
        }));
      
      default:
        return [];
    }
  };

  const addresses = getAddressesFromResponse(data, type);

  if (addresses.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <svg
          className="w-8 h-8 text-gray-400 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-gray-500">No addresses found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {addresses.map((item: any, index: number) => (
        <div
          key={`${type}-${index}`}
          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex justify-between items-start gap-3 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-primary border border-primary bg-primary/10">
              {item.type}
            </span>
            {item.lastSeenDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Last seen: {new Date(item.lastSeenDate).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            {item.address}
          </p>

          {(item.provider || item.state || item.name) && (
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              {item.provider && (
                <span>Provider: {item.provider}</span>
              )}
              {item.name && (
                <span>Name: {item.name}</span>
              )}
              {item.state && (
                <span>State: {item.state}</span>
              )}
              {item.pincode && (
                <span>Pincode: {item.pincode}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
interface IpCheckResponse{
  success:boolean;
  ipAddress :string;
  deviceInfo:{
    deviceType :string;
    osType :string;
  };
  associatedUsers: Array<{
    userId:string;
    formattedUserId:string;
    email?:string;
    phoneNumber?:string;
  }>;
  count :number;
  summary:string;
  message?:string;
}

export function Address() {
  const { brandId, customerId } = useParams();
  const permission = usePermission();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [mobileVerificationLoading, setMobileVerificationLoading] = useState<string | null>(null);
  const [mobileVerificationErrors, setMobileVerificationErrors] = useState<{[key: string]: string}>({});
  const [mobileVerificationData, setMobileVerificationData] = useState<{
    [key: string]: any;
  }>({});
  const [mobileVerificationFetched, setMobileVerificationFetched] = useState<{
    [key: string]: boolean;
  }>({});
  const[ipCheckData, setIpCheckData] = useState<IpCheckResponse | null>(null);
  const[isLoadingIpCheck, setIsLoadingIpCheck] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    addressProofType: AddressProofEnum.ELECTRICITY_BILL,
    remarks: "",
  });
  const [address, setAddress] = useState<null | {
    user: string;
    documentAddress: {
      type: string;
      address: string;
      createdAt?: Date;
      remarks?: string;
    }[];
    bre: {
      type: string;
      address: string;
      createdAt?: Date;
      remarks?: string;
    }[];
    alternateAddresses: {
      type: string;
      address: string;
      createdAt?: Date;
      remarks?: string;
    }[];
    geoAddresses: {
      type: string;
      address: string;
      createdAt?: Date;
      remarks?: string;
    }[];
  }>(null);

  // Define addressTypes here so it's available for all functions
  const addressTypes = [
    {
      value: "all",
      label: "All",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      count:
        (address?.documentAddress?.length || 0) +
        (address?.bre?.length || 0) +
        (address?.alternateAddresses?.length || 0) +
        (address?.geoAddresses?.length || 0) +
        // Fixed count calculation for mobile verification tabs
        (mobileVerificationData.MOBILE_TO_DL_ADVANCED?.user_address?.length || 
         mobileVerificationData.MOBILE_TO_DL_ADVANCED?.addresses?.length || 0) +
        (mobileVerificationData.MOBILE_TO_ADDRESSES_ECOM?.addresses?.length || 0) +
        (mobileVerificationData.MOBILE_TO_ADDRESSES?.addresses?.length || 0) +
        (mobileVerificationData.MOBILE_TO_LPG_DETAILS?.length || 
         mobileVerificationData.MOBILE_TO_LPG_DETAILS?.addresses?.length || 0),
    },
    {
      value: "document",
      label: "Documents",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      count: address?.documentAddress?.length || 0,
    },
    {
      value: "bre",
      label: "Credit Reports",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      count: address?.bre?.length || 0,
    },
    {
      value: "alternate",
      label: "Alternate",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      count: address?.alternateAddresses?.length || 0,
    },
    {
      value: "geo",
      label: "Location",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      count: address?.geoAddresses?.length || 0,
    },
    // New Mobile Verification Tabs
    {
      value: "driving_license",
      label: "Driving License",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      ),
      // Fixed: Check both API and cache structures
      count: (mobileVerificationData.MOBILE_TO_DL_ADVANCED?.user_address?.length || 
              mobileVerificationData.MOBILE_TO_DL_ADVANCED?.addresses?.length || 0),
      isMobileVerification: true,
      serviceType: "MOBILE_TO_DL_ADVANCED"
    },
    {
      value: "ecom_address",
      label: "Ecom Address",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      // Fixed: Check both API and cache structures
      count: (mobileVerificationData.MOBILE_TO_ADDRESSES_ECOM?.addresses?.length || 0),
      isMobileVerification: true,
      serviceType: "MOBILE_TO_ADDRESSES_ECOM"
    },
    {
      value: "mobile_address",
      label: "Address",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      // Fixed: Check both API and cache structures
      count: (mobileVerificationData.MOBILE_TO_ADDRESSES?.addresses?.length || 0),
      isMobileVerification: true,
      serviceType: "MOBILE_TO_ADDRESSES"
    },
    {
      value: "lpg_address",
      label: "LPG Address",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      ),
      // Fixed: Check both API (array) and cache (object with addresses) structures
      count: (Array.isArray(mobileVerificationData.MOBILE_TO_LPG_DETAILS) 
              ? mobileVerificationData.MOBILE_TO_LPG_DETAILS.length 
              : mobileVerificationData.MOBILE_TO_LPG_DETAILS?.addresses?.length || 0),
      isMobileVerification: true,
      serviceType: "MOBILE_TO_LPG_DETAILS"
    },
  
  {
    value :"ip_address",
    label :"IP Address",
    icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
    ),
    count:0,
    isMobileVerification:true,
    serviceType:"batch"
  }
];
  const fetchIpCheck = async () => {
    if (!customerId || !brandId) return;

    setIsLoadingIpCheck(true);
    try {
      const response = await checkIpAddressAssociation(customerId, brandId);
      if (response.success === false) {
        setIpCheckData(response);
        return;
      }
      setIpCheckData(response);
    } catch (error) {
      console.error("Error checking IP association:", error);
    } finally {
      setIsLoadingIpCheck(false);
    }
  };
  // Fetch basic address data on page load
  useEffect(() => {
    if (!customerId || !brandId) {
      setError("Customer ID or Brand ID is missing");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getCustomerAddresses(customerId, brandId);
        setAddress(response);
        await fetchIpCheck(); 
      } catch (error) {
        setError("Error fetching address data. Please try again.");
        console.error("Error fetching address data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customerId, brandId]);

  // Removed auto-fetch useEffect for mobile verification tabs

  const handleMobileVerification = async (serviceType: string) => {
    if (!customerId || !brandId) {
      setError("Customer ID or Brand ID is missing");
      return;
    }

    // Don't fetch again if already fetched successfully
    if (mobileVerificationFetched[serviceType] && mobileVerificationData[serviceType]) {
      return;
    }

    try {
      setMobileVerificationLoading(serviceType);
      setMobileVerificationErrors(prev => ({ ...prev, [serviceType]: '' }));
      setError(null);

      if (serviceType === 'batch') {
        const response = await verifyMobileBatch(customerId, brandId);
        // Process batch response - extract data from each service
        if (response) {
          const processedData: any = {};
          
          // Extract actual data from each service response
          if (response.mobileToAddresses?.success && response.mobileToAddresses.data) {
            processedData.MOBILE_TO_ADDRESSES = response.mobileToAddresses.data;
          }
          if (response.mobileToAddressesEcom?.success && response.mobileToAddressesEcom.data) {
            processedData.MOBILE_TO_ADDRESSES_ECOM = response.mobileToAddressesEcom.data;
          }
          if (response.mobileToLpgDetails?.success && response.mobileToLpgDetails.data) {
            processedData.MOBILE_TO_LPG_DETAILS = response.mobileToLpgDetails.data;
          }
          if (response.mobileToDlAdvanced?.success && response.mobileToDlAdvanced.data) {
            processedData.MOBILE_TO_DL_ADVANCED = response.mobileToDlAdvanced.data;
          }

          setMobileVerificationData(prev => ({
            ...prev,
            ...processedData
          }));
          setMobileVerificationFetched(prev => ({
            ...prev,
            batch: true,
            MOBILE_TO_DL_ADVANCED: true,
            MOBILE_TO_ADDRESSES_ECOM: true,
            MOBILE_TO_ADDRESSES: true,
            MOBILE_TO_LPG_DETAILS: true
          }));
        }
      } else {
        // Handle individual service calls
        const response = await verifyMobileWithService(serviceType, customerId, brandId);
        
        if (response.success) {
          // Store the actual data, not the wrapper object
          setMobileVerificationData(prev => ({
            ...prev,
            [serviceType]: response.data
          }));
          setMobileVerificationFetched(prev => ({
            ...prev,
            [serviceType]: true
          }));
        } else {
          throw new Error(response.message || `Failed to verify ${serviceType}`);
        }
      }
    } catch (error: any) {
      console.error(`Error verifying ${serviceType}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Failed to verify ${serviceType}`;
      
      setMobileVerificationErrors(prev => ({ 
        ...prev, 
        [serviceType]: errorMessage 
      }));
      
      // For individual service failures, still mark as fetched to avoid repeated calls
      if (serviceType !== 'batch') {
        setMobileVerificationFetched(prev => ({
          ...prev,
          [serviceType]: true
        }));
      }
    } finally {
      setMobileVerificationLoading(null);
    }
  };

  const handleTabChange = (tabValue: string) => {
    setSelectedType(tabValue);
    if(tabValue === 'ip_address' && !ipCheckData) {
      fetchIpCheck();
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !brandId) {
      setError("Customer ID or Brand ID is missing");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await addCustomerAddress(customerId, brandId, formData);
      setAddress((prev) =>
        prev
          ? {
              ...prev,
              alternateAddresses: [
                ...prev.alternateAddresses,
                {
                  type: formData.addressProofType,
                  address: `${formData.address}, ${formData.city}, ${formData.state}, ${formData.pincode}, ${formData.country}`,
                  createdAt: new Date(),
                  remarks: formData.remarks,
                },
              ],
            }
          : null
      );

      setShowAddDialog(false);
      setFormData({
        address: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        addressProofType: AddressProofEnum.ELECTRICITY_BILL,
        remarks: "",
      });
    } catch (error) {
      setError("Error adding address. Please try again.");
      console.error("Error adding address:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <AddressSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">
              Error Loading Addresses
            </h3>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 font-medium">
            No address information available
          </p>
        </div>
      </div>
    );
  }
const IpCheckResults = () => {
    if (isLoadingIpCheck) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            <span className="text-sm text-gray-500">Checking IP address...</span>
          </div>
        </div>
      );
    }

    if (!ipCheckData || !ipCheckData.success) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-gray-500">
            <span className="text-sm">IP address information not available</span>
          </div>
        </div>
      );
    }

    if (ipCheckData.count === 0) {
      return (
        <div className="bg-white border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-green-600">
            <FaCheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">IP Address Check</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">IP: <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{ipCheckData.ipAddress}</span></p>
         
          <p className="text-xs text-green-600 mt-1">No other accounts found</p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-red-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <FaExclamationTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">IP Address Check</span>
        </div>
        <p className="text-xs text-gray-600 mb-1">IP: <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">{ipCheckData.ipAddress}</span></p>
        
        <p className="text-xs text-red-600 font-medium mb-2">
          {ipCheckData.count} account(s) with same IP
        </p>
        <div className="space-y-1">
          {ipCheckData.associatedUsers.map((user, index) => (
            <div key={index} className="flex items-center space-x-2 text-xs bg-red-50 p-2 rounded">
              <span className="font-medium text-gray-700">
                {user.formattedUserId}
              </span>
              {user.email && (
                <span className="text-gray-500">({user.email})</span>
              )}
              {user.phoneNumber && (
                <span className="text-gray-500">• {user.phoneNumber}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  const renderFilteredAddresses = () => {
    if (selectedType === "all") {
      const hasMobileVerificationData = Object.keys(mobileVerificationData).length > 0;
      
      return (
        <div className="space-y-4">
          {address.user && (
            <div className="bg-gradient-to-br border border-primary rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-active)] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-black mb-0.5">
                    PAN Address
                  </h3>
                  <p className="text-sm text-gray-700 truncate">
                    {address.user}
                  </p>
                </div>
              </div>
            </div>
          )}

          {address.documentAddress?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Documents
                </h3>
                <span className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full font-semibold">
                  {address.documentAddress.length}
                </span>
              </div>
              <AddressCard addresses={address.documentAddress} />
            </div>
          )}

          {address.bre?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Credit Reports
                </h3>
                <span className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full font-semibold">
                  {address.bre.length}
                </span>
              </div>
              <AddressCard addresses={address.bre} />
            </div>
          )}

          {address.alternateAddresses?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Alternate
                </h3>
                <span className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full font-semibold">
                  {address.alternateAddresses.length}
                </span>
              </div>
              <AddressCard addresses={address.alternateAddresses} />
            </div>
          )}

          {address.geoAddresses?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-primary"
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
                  Geo Location
                </h3>
                <span className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full font-semibold">
                  {address.geoAddresses.length}
                </span>
              </div>
              <AddressCard addresses={address.geoAddresses} />
            </div>
          )}
          <IpCheckResults />
          {/* Mobile Verification Data in All Tab */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Mobile Verification
              </h3>
              
              {!hasMobileVerificationData && (
                <Button
                  onClick={() => handleMobileVerification('batch')}
                  variant="surface"
                  disabled={mobileVerificationLoading === 'batch'}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                >
                  {mobileVerificationLoading === 'batch' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Fetch Mobile Verification Data
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {mobileVerificationLoading === 'batch' ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Loading mobile verification data...</p>
              </div>
            ) : hasMobileVerificationData ? (
              <div className="grid gap-4">
                {mobileVerificationData.MOBILE_TO_DL_ADVANCED && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                      </svg>
                      Driving License Address
                    </h4>
                    <MobileVerificationCard 
                      data={mobileVerificationData.MOBILE_TO_DL_ADVANCED} 
                      type="MOBILE_TO_DL_ADVANCED" 
                      error={mobileVerificationErrors.MOBILE_TO_DL_ADVANCED}
                    />
                  </div>
                )}

                {mobileVerificationData.MOBILE_TO_ADDRESSES_ECOM && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Ecom Address
                    </h4>
                    <MobileVerificationCard 
                      data={mobileVerificationData.MOBILE_TO_ADDRESSES_ECOM} 
                      type="MOBILE_TO_ADDRESSES_ECOM" 
                      error={mobileVerificationErrors.MOBILE_TO_ADDRESSES_ECOM}
                    />
                  </div>
                )}

                {mobileVerificationData.MOBILE_TO_ADDRESSES && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Address
                    </h4>
                    <MobileVerificationCard 
                      data={mobileVerificationData.MOBILE_TO_ADDRESSES} 
                      type="MOBILE_TO_ADDRESSES" 
                      error={mobileVerificationErrors.MOBILE_TO_ADDRESSES}
                    />
                  </div>
                )}

                {mobileVerificationData.MOBILE_TO_LPG_DETAILS && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                      LPG Address
                    </h4>
                    <MobileVerificationCard 
                      data={mobileVerificationData.MOBILE_TO_LPG_DETAILS} 
                      type="MOBILE_TO_LPG_DETAILS" 
                      error={mobileVerificationErrors.MOBILE_TO_LPG_DETAILS}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 text-sm font-medium mb-3">
                  No mobile verification data available
                </p>
                <p className="text-gray-400 text-xs mb-4">
                  Click the button above to fetch mobile verification data
                </p>
                <Button
                  onClick={() => handleMobileVerification('batch')}
                  variant="surface"
                  className="flex items-center gap-1.5 text-xs mx-auto"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Fetch Mobile Verification Data
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
     if (selectedType === 'ip_address') {
      return (
        <div className="space-y-4">
          <IpCheckResults />
        </div>
      );
    }


    // Handle mobile verification tabs
    const mobileVerificationTab = addressTypes.find(tab => 
      tab.value === selectedType && tab.isMobileVerification
    );

    if (mobileVerificationTab) {
      const isLoadingTab = mobileVerificationLoading === mobileVerificationTab.serviceType;
      const error = mobileVerificationErrors[mobileVerificationTab.serviceType!];
      const hasData = mobileVerificationData[mobileVerificationTab.serviceType!];
      const isFetched = mobileVerificationFetched[mobileVerificationTab.serviceType!];
      
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">
              {mobileVerificationTab.label}
            </h3>
            {(!hasData || !isFetched) && !isLoadingTab && (
              <Button
                onClick={() => handleMobileVerification(mobileVerificationTab.serviceType!)}
                variant="surface"
                disabled={mobileVerificationLoading === mobileVerificationTab.serviceType}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                {mobileVerificationLoading === mobileVerificationTab.serviceType ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Fetch Data
                  </>
                )}
              </Button>
            )}
            {isLoadingTab && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Loading...
              </span>
            )}
          </div>

          {!isFetched && !isLoadingTab ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <p className="text-gray-500 text-sm font-medium mb-3">
                {mobileVerificationTab.label} data not fetched yet
              </p>
              <p className="text-gray-400 text-xs mb-4">
                Click the button above to fetch {mobileVerificationTab.label.toLowerCase()} data
              </p>
              <Button
                onClick={() => handleMobileVerification(mobileVerificationTab.serviceType!)}
                variant="surface"
                className="flex items-center gap-1.5 text-xs mx-auto"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Fetch {mobileVerificationTab.label} Data
              </Button>
            </div>
          ) : isLoadingTab ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Loading {mobileVerificationTab.label.toLowerCase()} data...</p>
            </div>
          ) : !hasData ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 text-sm font-medium mb-3">
                No {mobileVerificationTab.label.toLowerCase()} data available
              </p>
              <Button
                onClick={() => handleMobileVerification(mobileVerificationTab.serviceType!)}
                variant="surface"
                className="flex items-center gap-1.5 text-xs mx-auto"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Fetch {mobileVerificationTab.label} Data
              </Button>
            </div>
          ) : (
            <MobileVerificationCard 
              data={mobileVerificationData[mobileVerificationTab.serviceType!]} 
              type={mobileVerificationTab.serviceType!}
              error={error}
            />
          )}
        </div>
      );
    }

    // Handle regular address tabs
    const addressMap = {
      document: { title: "Document Addresses", data: address.documentAddress },
      bre: { title: "Credit Report Addresses", data: address.bre },
      alternate: {
        title: "Alternate Addresses",
        data: address.alternateAddresses,
      },
      geo: { title: "Geo Location Addresses", data: address.geoAddresses },
    };

    const selectedAddress = addressMap[selectedType as keyof typeof addressMap];

    if (!selectedAddress?.data?.length) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">
            No {selectedAddress?.title.toLowerCase()} found
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Try selecting a different category
          </p>
        </div>
      );
    }

    return <AddressCard addresses={selectedAddress.data} />;
  };

  return (
    <div>
      <Dialog
        title="Add New Address"
        onClose={() => setShowAddDialog(false)}
        isOpen={showAddDialog}
      >
        <form onSubmit={handleAddAddress} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter full address"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select State</option>
                {indianStatesWithCapitals.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                required
                pattern="[0-9]{6}"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="6-digit pincode"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Country"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Proof Type
            </label>
            <select
              name="addressProofType"
              value={formData.addressProofType}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {Object.values(AddressProofEnum).map((proofType) => (
                <option key={proofType} value={proofType}>
                  {proofType.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Any additional remarks (optional)"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Address"}
            </Button>
          </div>
        </form>
      </Dialog>

      <div className="max-w-8xl mx-auto">
        {/* Compact Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
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
              Customer Addresses
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage all address information
            </p>
          </div>
          {permission?.permission?.partnerPermissionType &&
            [
              PartnerUserPermissionType.WRITE,
              PartnerUserPermissionType.ALL,
            ].includes(permission?.permission.partnerPermissionType) && (
              <Button
                onClick={() => setShowAddDialog(true)}
                variant="surface"
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 shadow-sm hover:shadow-md transition-shadow text-primary"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Address
              </Button>
            )}
        </div>

        {/* Sleek Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-3">
          <div className="flex gap-1 p-1 overflow-x-auto scrollbar-hide">
            {addressTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTabChange(type.value)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200
                  ${
                    selectedType === type.value
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
              >
                <span
                  className={
                    selectedType === type.value ? "text-white" : "text-gray-500"
                  }
                >
                  {type.icon}
                </span>
                <span>{type.label}</span>
                {type.count > 0 && (
                  <span
                    className={`
                    px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[20px] text-center
                    ${
                      selectedType === type.value
                        ? "bg-white text-primary"
                        : "bg-gray-200 text-gray-700"
                    }
                  `}
                  >
                    {type.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {renderFilteredAddresses()}
        </div>
      </div>
    </div>
  );
}