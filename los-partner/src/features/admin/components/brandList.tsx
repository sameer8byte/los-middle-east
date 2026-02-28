import { useState, useEffect } from "react";
import { FiSettings } from "react-icons/fi";
import { MdWarning } from "react-icons/md";
import { Brand } from "../../../shared/types/admin";
import { getBrands } from "../../../shared/services/api/admin.api";

// Skeleton Components
const BrandCardSkeleton = () => (
  <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
    <div className="block p-6 text-center">
      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-24 mb-1"></div>
        <div className="h-4 bg-gray-100 rounded w-16"></div>
      </div>
    </div>
    <div className="px-6 pb-4 border-t border-gray-100">
      <div className="w-full h-8 bg-gray-100 rounded-lg"></div>
    </div>
  </div>
);

const HeaderSkeleton = () => (
  <div className="mb-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
    <div className="h-5 bg-gray-100 rounded w-64"></div>
  </div>
);

export function BrandsList() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);
      try {
        const response = await getBrands();
        setBrands(response);
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <HeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <BrandCardSkeleton key={`skeleton-card-${i + 1}`} />
          ))}
        </div>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <MdWarning className="text-4xl text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No brands found
        </h3>
        <p className="text-sm text-gray-600">
          Get started by creating your first brand.
        </p>
      </div>
    );
  }

  return (
    <div >
 
      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden transform hover:scale-[1.02]"
          >
            {/* Brand Link */}
            <a
              href={`/${brand.id}/dashboard`}
              className="block p-6 text-center hover:bg-gradient-to-b hover:from-blue-50 hover:to-white transition-all duration-300"
            >
              <div className="flex flex-col items-center">
                {/* Logo Container */}
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-200 group-hover:border-blue-300 group-hover:shadow-md transition-all duration-300">
                    <img
                      src={brand.logoUrl}
                      alt={`${brand.name} logo`}
                      className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.classList.remove("hidden");
                          fallback.classList.add("flex");
                        }
                      }}
                    />
                    <div className="hidden w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Brand Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition-colors duration-300">
                  {brand.name}
                </h3>

                {/* Stats/Info */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active
                  </span>
                </div>

                {/* Dashboard Link Indicator */}
                <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                  Open Dashboard →
                </span>
              </div>
            </a>

            {/* Settings Button */}
            <div className="px-4 pb-4 border-t border-gray-100">
              <button
                onClick={() => (window.location.href = `/${brand.id}/settings`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-sm"
              >
                <FiSettings className="text-base transition-transform duration-200 group-hover:rotate-90" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
