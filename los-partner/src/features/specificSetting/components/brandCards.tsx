import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import { createBrandCard, deleteBrandCard, getBrandCards, updateBrandCard } from "../../../shared/services/api/settings/brandCards.setting.api";

interface BrandCard {
    id: string;
    brandId: string;
    imageUrl: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

interface BrandCardForm {
    imageUrl: string;
    title: string;
    description: string;
    imageFile?: File | null;
}

export function BrandCards() {
    const { brandId } = useParams<{ brandId: string }>();
    const [cards, setCards] = useState<BrandCard[]>([]);
    const [editingCard, setEditingCard] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<BrandCardForm>({
        imageUrl: "",
        title: "",
        description: "",
        imageFile: null
    });
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

        fetchCards();
    }, [brandId]);

    // Cleanup object URLs on component unmount
    useEffect(() => {
        return () => {
            if (form.imageFile && form.imageUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(form.imageUrl);
            }
        };
    }, [form.imageFile, form.imageUrl]);

    const fetchCards = async () => {
        if (!brandId) return;
        
        setErrorMessage(null);
        setSuccessMessage(null);
        setFetching(true);

        try {
            const response = await getBrandCards(brandId);
            setCards(response);
        } catch (error) {
            console.error("Failed to fetch brand cards:", error);
            setErrorMessage("Failed to load brand cards. Please try again later.");
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMessage(null);
        setSuccessMessage(null);

        const file = e.target.files?.[0] || null;
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrorMessage('Please select a valid image file.');
                return;
            }
            // Validate file size (e.g., max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrorMessage('Image size should be less than 5MB.');
                return;
            }
            
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setForm((prev) => ({ 
                ...prev, 
                imageFile: file,
                imageUrl: previewUrl
            }));
        } else {
            setForm((prev) => ({ 
                ...prev, 
                imageFile: null,
                imageUrl: ""
            }));
        }
    };

    const handleCreate = async () => {
        if (!brandId) return;

        setErrorMessage(null);
        setSuccessMessage(null);
        setLoading(true);

        if ((!form.imageFile && !form.imageUrl) || !form.title || !form.description) {
            setErrorMessage("All fields are required including an image.");
            setLoading(false);
            return;
        }

        try {
            const newCard = await createBrandCard(brandId, {
                title: form.title,
                description: form.description,
                imageFile: form.imageFile || undefined,
                imageUrl: form.imageFile ? 'https://placeholder.com/image-upload' : form.imageUrl || ''
            });
            
            setCards((prev) => [...prev, newCard]);
            
            // Clean up object URL if it was created
            if (form.imageFile && form.imageUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(form.imageUrl);
            }
            
            setForm({ imageUrl: "", title: "", description: "", imageFile: null });
            setIsCreating(false);
            setSuccessMessage("Brand card created successfully!");
        } catch (error) {
            console.error("Failed to create brand card:", error);
            setErrorMessage("Failed to create card. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (cardId: string) => {
        if (!brandId) return;

        setErrorMessage(null);
        setSuccessMessage(null);
        setLoading(true);

        if ((!form.imageFile && !form.imageUrl) || !form.title || !form.description) {
            setErrorMessage("All fields are required including an image.");
            setLoading(false);
            return;
        }

        try {
            const updatedCard = await updateBrandCard(brandId, cardId, {
                title: form.title,
                description: form.description,
                imageFile: form.imageFile || undefined,
                imageUrl: form.imageFile ? 'https://placeholder.com/image-upload' : form.imageUrl || ''
            });
            
            setCards((prev) => prev.map(card => card.id === cardId ? updatedCard : card));
            
            // Clean up object URL if it was created
            if (form.imageFile && form.imageUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(form.imageUrl);
            }
            
            setEditingCard(null);
            setForm({ imageUrl: "", title: "", description: "", imageFile: null });
            setSuccessMessage("Brand card updated successfully!");
        } catch (error) {
            console.error("Failed to update brand card:", error);
            setErrorMessage("Failed to update card. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cardId: string) => {
        if (!brandId || !window.confirm("Are you sure you want to delete this card?")) return;

        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            await deleteBrandCard(brandId, cardId);
            setCards((prev) => prev.filter(card => card.id !== cardId));
            setSuccessMessage("Brand card deleted successfully!");
        } catch (error) {
            console.error("Failed to delete brand card:", error);
            setErrorMessage("Failed to delete card. Please try again.");
        }
    };

    const startEditing = (card: BrandCard) => {
        setEditingCard(card.id);
        setForm({
            imageUrl: card.imageUrl,
            title: card.title,
            description: card.description,
            imageFile: null
        });
        setIsCreating(false);
    };

    const cancelEditing = () => {
        // Clean up any object URLs before resetting form
        if (form.imageFile && form.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(form.imageUrl);
        }
        
        setEditingCard(null);
        setIsCreating(false);
        setForm({ imageUrl: "", title: "", description: "", imageFile: null });
        setErrorMessage(null);
        setSuccessMessage(null);
    };

    const startCreating = () => {
        setIsCreating(true);
        setEditingCard(null);
        setForm({ imageUrl: "", title: "", description: "", imageFile: null });
        setErrorMessage(null);
        setSuccessMessage(null);
    };

    if (fetching) {
        return (
            <div className="p-8 text-[var(--color-on-surface)] opacity-70 flex items-center gap-2">
                <Spinner />
                <span>Loading brand cards...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
            <div className="flex justify-between items-center pb-6 mb-8 border-b border-[var(--color-muted)] border-opacity-30">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-on-background)]">Brand Cards</h1>
                    <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
                        Manage your brand's promotional cards
                    </p>
                </div>
                <button
                    onClick={startCreating}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                    disabled={isCreating || editingCard !== null}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Card
                </button>
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

            {/* Create New Card Form */}
            {isCreating && (
                <div className="mb-8 p-6 bg-[var(--color-background)] rounded-lg border border-[var(--color-muted)] border-opacity-30">
                    <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Create New Card</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="create-image" className="block text-sm font-medium text-[var(--color-on-surface)] opacity-70 mb-2">Image</label>
                            <div className="space-y-3">
                                <input
                                    id="create-image"
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-[var(--color-on-surface)] opacity-70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-primary)] bg-opacity-10 file:text-[var(--color-on-primary)] hover:file:bg-[var(--color-primary)] bg-opacity-15"
                                    disabled={loading}
                                />
                                {form.imageUrl && (
                                    <div className="relative">
                                        <img
                                            src={form.imageUrl}
                                            alt="Preview"
                                            className="w-full h-32 object-cover rounded-lg border border-[var(--color-muted)] border-opacity-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (form.imageFile && form.imageUrl) {
                                                    URL.revokeObjectURL(form.imageUrl);
                                                }
                                                setForm(prev => ({ ...prev, imageFile: null, imageUrl: "" }));
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-[var(--color-error)] bg-opacity-100 text-white rounded-full hover:bg-red-600"
                                            disabled={loading}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="create-title" className="block text-sm font-medium text-[var(--color-on-surface)] opacity-70 mb-2">Title</label>
                            <input
                                id="create-title"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter card title"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="create-description" className="block text-sm font-medium text-[var(--color-on-surface)] opacity-70 mb-2">Description</label>
                            <textarea
                                id="create-description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2.5 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter card description"
                                disabled={loading}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCreate}
                                className="px-5 py-2.5 text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center space-x-2">
                                        <Spinner />
                                        <span>Creating...</span>
                                    </div>
                                ) : (
                                    "Create Card"
                                )}
                            </button>
                            <button
                                onClick={cancelEditing}
                                className="px-5 py-2.5 text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-lg hover:bg-[var(--color-background)]"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div key={card.id} className="bg-white border border-[var(--color-muted)] border-opacity-30 rounded-lg overflow-hidden shadow-sm">
                        {editingCard === card.id ? (
                            // Edit Form
                            <div className="p-4">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor={`edit-image-${card.id}`} className="block text-sm font-medium text-[var(--color-on-surface)] opacity-70 mb-2">Image</label>
                                        <div className="space-y-3">
                                            <input
                                                id={`edit-image-${card.id}`}
                                                name="image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="block w-full text-sm text-[var(--color-on-surface)] opacity-70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-primary)] bg-opacity-10 file:text-[var(--color-on-primary)] hover:file:bg-[var(--color-primary)] bg-opacity-15"
                                                disabled={loading}
                                            />
                                            {form.imageUrl && (
                                                <div className="relative">
                                                    <img
                                                        src={form.imageUrl}
                                                        alt="Preview"
                                                        className="w-full h-24 object-cover rounded-lg border border-[var(--color-muted)] border-opacity-50"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (form.imageFile && form.imageUrl?.startsWith('blob:')) {
                                                                URL.revokeObjectURL(form.imageUrl);
                                                            }
                                                            setForm(prev => ({ ...prev, imageFile: null, imageUrl: card.imageUrl }));
                                                        }}
                                                        className="absolute top-1 right-1 p-1 bg-[var(--color-error)] bg-opacity-100 text-white rounded-full hover:bg-red-600"
                                                        disabled={loading}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor={`edit-title-${card.id}`} className="block text-sm font-medium text-[var(--color-on-surface)] opacity-70 mb-2">Title</label>
                                        <input
                                            id={`edit-title-${card.id}`}
                                            name="title"
                                            value={form.title}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`edit-description-${card.id}`} className="block text-sm font-medium text-[var(--color-on-surface)] opacity-70 mb-2">Description</label>
                                        <textarea
                                            id={`edit-description-${card.id}`}
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            rows={2}
                                            className="w-full px-3 py-2 text-[var(--color-on-background)] border border-[var(--color-muted)] border-opacity-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdate(card.id)}
                                            className="flex-1 px-3 py-2 text-sm text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)]"
                                            disabled={loading}
                                        >
                                            {loading ? <Spinner /> : "Save"}
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="flex-1 px-3 py-2 text-sm text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-lg hover:bg-[var(--color-background)]"
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Display Card
                            <>
                                <img
                                    src={card.imageUrl}
                                    alt={card.title}
                                    className="w-full h-48 object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                                    }}
                                />
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-2">{card.title}</h3>
                                    <p className="text-[var(--color-on-surface)] opacity-70 text-sm mb-4">{card.description}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startEditing(card)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-on-primary)] bg-[var(--color-primary)] bg-opacity-10 rounded hover:bg-[var(--color-primary)] bg-opacity-15"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(card.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-on-error)] bg-[var(--color-error)] bg-opacity-10 rounded hover:bg-[var(--color-error)] bg-opacity-10"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {cards.length === 0 && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-[var(--color-on-surface)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-[var(--color-on-background)]">No cards found</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface)] opacity-70">Get started by creating your first brand card.</p>
                </div>
            )}
        </div>
    );
}
