import { RiShieldCheckFill } from "react-icons/ri";
import { useAppSelector } from "../../redux/store";

const Footer = () => {
  const brand = useAppSelector((state) => state.index);
  // --- Get domain and theme ---
  const fullDomain = window.location.hostname.replace("www.", "");
  const baseDomain = fullDomain.split(".").slice(-2).join(".");
  const isFastsalary = baseDomain === "fastsalary.com";
  const isPaisapop = baseDomain === "paisapop.com";
  const isSalary4Sure = fullDomain === "web2.salary4sure.com";

  return (
    <footer
      className={`bg-white md:bg-gray-50 text-gray-700 px-6 md:px-12 py-10 border-t border-gray-200 ${(isPaisapop || isSalary4Sure) ? "" : "hidden"} md:block`}
    >
      {isSalary4Sure && (
        <div className="mb-16 space-y-10">
          {/* Rates and Charges Card */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 md:p-12 overflow-hidden">
            <h3 className="text-xl md:text-3xl font-bold text-black text-center mb-10">Rates and Charges</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1">
              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                <span className="text-sm text-gray-700 font-medium">Loan Amount</span>
                <span className="text-sm md:text-lg text-black font-semibold">BHD 50 - BHD 1000</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-slate-50"> 
                <span className="text-sm text-gray-700 font-medium">Pre-closure Charges</span>
                <span className="text-sm md:text-lg text-emerald-500 font-semibold">No Charges</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                <span className="text-sm text-gray-700 font-medium">Tenure</span>
                <span className="text-sm md:text-lg text-black font-semibold">7 - 45 Days</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                <span className="text-sm text-gray-700 font-medium">Prepayment Charges</span>
                <span className="text-sm md:text-lg text-emerald-500 font-semibold">No Charges</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b md:border-none border-slate-50">
                <span className="text-sm text-gray-700 font-medium">APR</span>
                <span className="text-sm md:text-lg text-black font-semibold">15% - 35%</span>
              </div>
              <div className="flex justify-between items-center py-4">
                <span className="text-sm text-gray-700 font-medium">Min. Salary</span>
                <span className="text-sm md:text-lg text-black font-semibold">≥ BHD 500</span>
              </div>
            </div>
          </div>

          {/* Illustrations Card */}
          <div className="bg-[#f8faff] rounded-[2.5rem] border border-blue-50/50 p-6 md:p-12 overflow-hidden">
            <h3 className="text-xl md:text-3xl font-bold text-black text-center mb-2">Illustrations</h3>
            <p className="text-center text-sm text-black font-medium mb-1">Representative Example: How Your {brand.name} Loan Works</p>
            <p className="text-center text-gray-500 text-[11px] md:text-sm mb-10">(Example: BHD 1000 Loan)</p>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-12 max-w-4xl mx-auto shadow-sm">
              <p className="text-xs md:text-sm text-center text-gray-600 mb-8 leading-relaxed">
                When you take a loan of BHD 1000 from {brand.name}, here's how the charges and disbursal break down:
              </p>

              <div className="space-y-1">
                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                  <span className="text-sm text-gray-700 font-medium">Processing Fee</span>
                  <span className="text-sm font-semibold text-black text-right">10% of BHD 1000 = BHD 100</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                  <span className="text-sm text-gray-700 font-medium">GST on Processing Fee</span>
                  <span className="text-sm font-semibold text-black text-right">18% of BHD 1000 = BHD 180</span> 
                </div>
                <div className="flex justify-between items-center py-5">
                  <span className="text-sm text-black font-bold">Total Deduction</span>
                  <span className="text-sm font-bold text-black text-right">BHD 1,180 (11.8% of loan amount)</span>
                </div>

                <div className="mt-6 bg-emerald-50 text-emerald-700 p-5 md:p-6 rounded-xl flex flex-col md:flex-row md:justify-between items-center gap-2 md:gap-0 font-bold text-center md:text-left border border-emerald-100/50">
                  <span className="text-sm uppercase tracking-tight">Final Amount Disbursed to You</span>
                  <span className="text-sm">BHD 1000 - BHD 180 = BHD 820</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand and Tagline */}
        <div>
          <h2 className="text-2xl font-bold mb-2">{brand.name}</h2>
          <p className="mb-3">
            Providing short-term financial solutions when you need them most.
          </p>
          <div className="flex items-center gap-2 text-black font-medium">
            <RiShieldCheckFill className="w-5 h-5" />
            Licensed & Regulated
          </div>
          <div className="mt-4">
            {/* RBI License */}
            <div className="flex items-center gap-2  px-3 py-1 rounded-full border border-[var(--text-primary)]">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                CBB (Central Bank of Bahrain):
                {brand.brandDetails.rbiRegistrationNo}
              </span>
            </div>{" "}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
          <ul className="space-y-2 text-gray-600">
            <li>
              <a href="#" className="hover:underline">
                Apply Now
              </a>
            </li>
            <li>
              <a href={brand.brandPolicyLinks.htw} className="hover:underline">
                How It Works
              </a>
            </li>
            <li>
              <a
                href={brand.brandPolicyLinks.faqUrl}
                className="hover:underline"
              >
                FAQ
              </a>
            </li>
            <li className="space-y-2">
              <a
                href={brand.brandPolicyLinks.contactUs}
                className="hover:underline block font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact Us
              </a>

              {isFastsalary && (
                <>
                  <div className="text-sm leading-relaxed">
                    <p>
                      <span className="font-semibold">
                        Nodal Officer Email:
                      </span>
                      <br />
                      <a
                        href="mailto:nodal.officer@ramchandrafinance.com"
                        className="hover:underline"
                      >
                        nodal.officer@ramchandrafinance.com
                      </a>
                    </p>

                    <p className="mt-1">
                      <span className="font-semibold">For Grievance:</span>
                      <br />
                      <a
                        href="mailto:gro@ramchandrafinance.com"
                        className="hover:underline"
                      >
                        gro@ramchandrafinance.com
                      </a>
                    </p>
                  </div>

                  <div className="text-sm leading-relaxed mt-2">
                    <span className="font-semibold">Address:</span>
                    <br />
                    Corporate Office: F 40, Phase 1, Sector 6,
                    <br />
                    Noida, Gautambuddha Nagar,
                    <br />
                    Uttar Pradesh – 201301
                  </div>
                </>
              )}
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Legal</h3>
          <ul className="space-y-2 text-gray-600">
            <li>
              <a
                href={brand.brandPolicyLinks.brandloanDetailsPolicyUrl}
                className="hover:underline cursor-pointer"
              >
                Loan Details
              </a>
            </li>
            <li>
              <a
                href={brand.brandPolicyLinks.termsConditionUrl}
                className="hover:underline"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href={brand.brandPolicyLinks.privacyPolicyUrl}
                className="hover:underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href={brand.brandPolicyLinks.faqUrl}
                className="hover:underline"
              >
                Complaints
              </a>
            </li>
          </ul>
        </div>

        {/* Disclosures */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Important Disclosures</h3>
          <div className="text-sm text-gray-700 space-y-3">
            <p>
              <span className="font-bold">Interest Rate Disclosure:</span> The
              Interest Rate for our loans ranges depending on loan term and
              amount.
            </p>
            <p>
              <span className="font-bold">Late Payment:</span> Late or
              non-payment may result in fees. Failure to repay may affect future
              loans.
            </p>
            <p>
              <span className="font-bold">Warning:</span> This loan is not for
              long-term financial problems. Repeated use may lead to hardship.
            </p>
            <p>
              <span className="font-bold">Availability:</span> Loans are not
              available in all states. See Terms of Service for more.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mt-10 text-center text-sm text-gray-500 border-t pt-6">
        <p>
          © 
           {new Date().getFullYear()} {
            " "
           }
            {brand.name}. All rights reserved. Licensed by Reserve Bank of
          India.
        </p>
        <p>
          {brand.name} is not a lender in all states. This website does not
          constitute an offer or solicitation to lend.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
