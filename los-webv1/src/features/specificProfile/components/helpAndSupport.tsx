import { useAppSelector } from "../../../redux/store";

export function HelpAndSupport() {
  const brand = useAppSelector((state) => state.index);

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4 bg-gray-50 min-h-screen">
      <div className="flex flex-col w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Help and Support</h1>
        <p className="text-gray-700 mb-4">
          Here you can find help and support resources. If you have any questions or need assistance, feel free to contact us.
        </p>

        {brand?.brandDetails?.contactEmail && (
          <p className="text-gray-700 mb-2">
            Email us at:{" "}
            <a
              href={`mailto:${brand.brandDetails.contactEmail}`}
              className="text-primary underline"
            >
              {brand.brandDetails.contactEmail}
            </a>
          </p>
        )}

        {brand?.brandDetails?.contactPhone && (
          <p className="text-gray-700 mb-4">
            Call us at:{" "}
            <a
              href={`tel:${brand.brandDetails.contactPhone}`}
              className="text-primary underline"
            >
              {brand.brandDetails.contactPhone}
            </a>
          </p>
        )}

        {/* Add more support info or FAQs below */}
      </div>
    </div>
  );
}
