import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import { getBrandDetails, updateBrandDetails } from "../../../shared/services/api/settings/general.setting.api";
 

interface BrandDetails {
    address: string;
    contactEmail: string;
    contactPhone: string;
    website?: string;
    gstNumber?: string;
    cinNumber?: string;
    rbiRegistrationNo?: string;
    lenderName?: string;
    description?: string;
    title?: string;
}

export function BrandDetails() {
    const { brandId } = useParams<{ brandId: string }>();
    const [details, setDetails] = useState<BrandDetails | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState<Partial<BrandDetails>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!brandId) {
            console.error("Brand ID is not provided");
            setErrorMessage("Brand ID is missing.");
            setFetching(false);
            return;
        }

        const fetchDetails = async () => {
            setErrorMessage(null);
            setSuccessMessage(null);
            setFetching(true);

            try {
                const response = await getBrandDetails(brandId);
                setDetails(response);
                setForm(response);
            } catch (error) {
                console.error("Failed to fetch brand details:", error);
                setErrorMessage("Failed to load brand details. Please try again later.");
            } finally {
                setFetching(false);
            }
        };

        fetchDetails();
    }, [brandId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!brandId) {
            console.error("Brand ID is not provided");
            setErrorMessage("Brand ID is missing.");
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        setLoading(true);

        // Simple validation example (expand as needed)
        if (!form.address || !form.contactEmail || !form.contactPhone) {
            setErrorMessage("Address, Contact Email, and Contact Phone are required.");
            setLoading(false);
            return;
        }

        try {
            const updated = {
                address: form.address,
                contactEmail: form.contactEmail,
                contactPhone: form.contactPhone,
                website: form.website || "",
                gstNumber: form.gstNumber || "",
                cinNumber: form.cinNumber || "",
                rbiRegistrationNo: form.rbiRegistrationNo || "",
                lenderName: form.lenderName || "",
                description: form.description || "",
                title: form.title || "",
            };

            const response = await updateBrandDetails(brandId, updated);

            setDetails(response);
            setForm(response);
            setEditMode(false);
            setSuccessMessage("Brand details updated successfully!");
        } catch (error) {
            console.error("Failed to update brand details:", error);
            setErrorMessage("Failed to save changes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setErrorMessage(null);
        setSuccessMessage(null);
        if (details) setForm(details);
        setEditMode(false);
    };

    const renderField = (
        label: string,
        name: keyof BrandDetails,
        placeholder = ""
    ) => (
        <div className="flex flex-col gap-1" key={name}>
            <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">{label}</label>
            {editMode ? (
                <input
                    name={name}
                    value={form[name] ?? ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={placeholder}
                    disabled={loading}
                />
            ) : (
                <div className="px-4 py-2.5 text-[var(--color-on-background)] bg-[var(--color-background)] rounded-lg">
                    {details?.[name] || <span className="text-[var(--color-on-surface)] opacity-50 italic">Not set</span>}
                </div>
            )}
        </div>
    );

    if (fetching) {
        return (
            <div className="p-8 text-[var(--color-on-surface)] opacity-70 flex items-center gap-2">
                <Spinner />
                <span>Loading brand details...</span>
            </div>
        );
    }

    if (!details) {
        return <div className="p-8 text-[var(--color-on-error)]">{errorMessage || "No brand details found."}</div>;
    }

    return (
        <div className="max-w-3xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
            <div className="flex justify-between items-center pb-6 mb-8 border-b border-[var(--color-muted)] border-opacity-30">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-on-background)]">Brand Details Settings</h1>
                    <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                        Manage your brand’s general details and URLs
                    </p>
                </div>
                {!editMode && (
                    <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                        </svg>
                        Edit Details
                    </button>
                )}
            </div>

            {/* Show error or success messages */}
            {(errorMessage || successMessage) && (
                <div
                    className={`mb-6 p-3 rounded ${
                        errorMessage
                            ? "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)] border border-red-300"
                            : "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)] border border-green-300"
                    }`}
                >
                    {errorMessage || successMessage}
                </div>
            )}

            <div className="space-y-8">
                {renderField("Address", "address")}
                {renderField("Contact Email", "contactEmail")}
                {renderField("Contact Phone", "contactPhone")}
                {renderField("Website", "website")}
                {renderField("GST Number", "gstNumber")}
                {renderField("CIN Number", "cinNumber")}
                 {renderField("NBFC Registration Number", "rbiRegistrationNo")}
                {renderField("Lender Name", "lenderName")}
                {renderField("Title", "title")}
                {renderField("Description", "description")}
            </div>

            {editMode && (
                <div className="flex justify-end gap-3 pt-8 mt-6 border-t border-[var(--color-muted)] border-opacity-30">
                    <button
                        onClick={handleCancel}
                        className="px-5 py-2.5 text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-lg hover:bg-[var(--color-background)]"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)]"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center space-x-2">
                                <Spinner />
                                <span>Saving...</span>
                            </div>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
