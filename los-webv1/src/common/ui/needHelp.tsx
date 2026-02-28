import { useAppSelector } from "../../redux/store";
import {
  FiHelpCircle,
  FiPhone,
  FiMail,
  FiMapPin,
  FiClock,
} from "react-icons/fi";
import { useQueryParams } from "../../hooks/useQueryParams";

export function NeedHelp() {
  const { setQuery } = useQueryParams();
  const brand = useAppSelector((state) => state.index);

  return (
    <div className="max-w-sm p-6  bg-white  rounded-brand shadow-md">
      <div className="p-7">
        <div className="flex items-start mb-5">
          <FiHelpCircle className="text-primary text-3xl mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Need Help?</h2>
            <p className="text-secondary mt-1">
              Our support team is ready to assist you
            </p>
          </div>
        </div>
  
        <div className="space-y-4 mb-6">
          <div className="flex">
            <div className="bg-primary-light p-2.5 rounded-lg mr-3">
              <FiPhone className="text-primary-dark text-xl" />
            </div>
            <div>
              <p className="text-sm text-secondary">Call us</p>
              <p className="font-medium">{brand.brandDetails.contactPhone}</p>
            </div>
          </div>
  
          <div className="flex">
            <div className="bg-primary-light p-2.5 rounded-lg mr-3">
              <FiMail className="text-primary-dark text-xl" />
            </div>
            <div>
              <p className="text-sm text-secondary">Email</p>
              <p className="font-medium">{brand.brandDetails.contactEmail}</p>
            </div>
          </div>
  
          <div className="flex">
            <div className="bg-primary-light p-2.5 rounded-lg mr-3">
              <FiMapPin className="text-primary-dark text-xl" />
            </div>
            <div>
              <p className="text-sm text-secondary">Address</p>
              <p className="font-medium">{brand.brandDetails.address}</p>
            </div>
          </div>
  
          <div className="flex">
            <div className="bg-primary-light p-2.5 rounded-lg mr-3">
              <FiClock className="text-primary-dark text-xl" />
            </div>
            <div>
              <p className="text-sm text-secondary">Hours</p>
              <p className="font-medium">Monday–Friday, 8am–8pm</p>
            </div>
          </div>
        </div>
  
        <button
          onClick={() => setQuery("needHelp", "true")}
          className="w-full px-5 py-3.5 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark rounded-lg text-white font-semibold shadow-md transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
        >
          Contact Support
        </button>
      </div>
    </div>
  
  );
}
