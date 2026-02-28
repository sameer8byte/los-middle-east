import { useAppSelector } from "../../redux/store";

export function SecureApplication() {
  const brand = useAppSelector((state) => state.index);
  return (
    <div className="max-w-sm p-6  bg-white  rounded-brand shadow-md">
      <h2 className="text-xl font-bold mb-1 text-heading">
        Secure Application
      </h2>
      <p className="text-label-muted mb-4">Your information is protected</p>

      <div className="flex items-center mb-4">
        <svg
          className="w-6 h-6 text-heading mr-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" />
        </svg>
        <div>
          <p className="font-semibold text-label">256-bit encryption</p>
          <p className="text-sm text-label-muted">
            Bank-level security protocols
          </p>
        </div>
      </div>

      <p className="text-sm text-label-muted">
        We never share your information with unauthorized third parties. See our{" "}
        <a
          href={
            brand.brandPolicyLinks.privacyPolicyUrl ||
            "https://example.com/privacy-policy"
          }
          className="text-primary underline hover:text-primary-hover"
        >
          Privacy Policy
        </a>{" "}
        for details.
      </p>
    </div>
  );
}
