import { useEffect, useState } from "react";
 import { useParams } from "react-router-dom";
import { Spinner } from "../../../common/ui/spinner";
import { getAppearance, updateAppearance } from "../../../shared/services/api/settings/appearance.setting.api";
import { Appearance, FONT_FAMILIES } from "../../../shared/types/admin";
 
function ColorInputField({
  label,
  name,
  value,
  editMode,
  onChange,
}: {
  label: string;
  name: keyof Appearance;
  value: string | undefined;
  editMode: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">{label}</label>
      {editMode ? (
        <input
          type="color"
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full h-10 cursor-pointer rounded-lg border border-[var(--color-muted)] border-opacity-30"
        />
      ) : (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg border border-[var(--color-muted)] border-opacity-30"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-[var(--color-on-surface)] opacity-70">{value}</span>
        </div>
      )}
    </div>
  );
}

export function AppearanceSetting() {
  const { brandId } = useParams();
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState<Partial<Appearance>>({
    fontFamily: "Inter",
    baseFontSize: 16,
    roundedCorners: false,
    darkMode: false,
  });

  useEffect(() => {
    if (!brandId) return;

    (async () => {
      try {
        const response = await getAppearance(brandId);
        setAppearance(response);
        setForm({ ...response });
      } catch (error) {
        console.error("Failed to fetch appearance settings:", error);
        setMessage({ type: "error", text: "Failed to load settings" });
      }
    })();
  }, [brandId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = async () => {
    if (!brandId) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await updateAppearance(
        brandId,
        form.primaryColor || "",
        form.secondaryColor || "",
        form.backgroundColor || "",
        form.surfaceColor || "",
        form.primaryTextColor || "",
        form.secondaryTextColor || "",
        form.successColor || "",
        form.warningColor || "",
        form.errorColor || "",
        form.fontFamily || "Inter",
        form.baseFontSize || 16,
        form.roundedCorners || false,
        form.darkMode || false,
        form.primaryHoverColor || "",
        form.primaryFocusColor || "",
        form.primaryActiveColor || "",
        form.primaryLightColor || "",
        form.primaryContrastColor || "",
        form.secondaryHoverColor || "",
        form.secondaryFocusColor || "",
        form.secondaryActiveColor || "",
        form.secondaryLightColor || "",
        form.secondaryContrastColor || "",
        form.surfaceTextColor || "",
        form.backgroundTextColor || ""
      );

      setAppearance({ ...appearance, ...response });
      setEditMode(false);
      setMessage({ type: "success", text: "Appearance settings updated successfully." });
    } catch (error) {
      console.error("Failed to save appearance:", error);
      setMessage({ type: "error", text: "Failed to save appearance settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...appearance! }); // Defensive copy
    setEditMode(false);
  };

  const colorFields = [
    { label: "Primary", name: "primaryColor" },
    { label: "Secondary", name: "secondaryColor" },
    { label: "Background", name: "backgroundColor" },
    { label: "Surface", name: "surfaceColor" },
    { label: "Success", name: "successColor" },
    { label: "Warning", name: "warningColor" },
    { label: "Error", name: "errorColor" },
    { label: "Primary Text", name: "primaryTextColor" },
    { label: "Secondary Text", name: "secondaryTextColor" },
    { label: "Surface Text", name: "surfaceTextColor" },
    { label: "Background Text", name: "backgroundTextColor" },
    { label: "Primary Hover", name: "primaryHoverColor" },
    { label: "Primary Focus", name: "primaryFocusColor" },
    { label: "Primary Active", name: "primaryActiveColor" },
    { label: "Primary Light", name: "primaryLightColor" },
    { label: "Primary Contrast", name: "primaryContrastColor" },
    { label: "Secondary Hover", name: "secondaryHoverColor" },
    { label: "Secondary Focus", name: "secondaryFocusColor" },
    { label: "Secondary Active", name: "secondaryActiveColor" },
    { label: "Secondary Light", name: "secondaryLightColor" },
    { label: "Secondary Contrast", name: "secondaryContrastColor" },
  ];

  if (!appearance)
    return (
      <div className="p-8 text-[var(--color-on-surface)] opacity-70">Loading appearance settings...</div>
    );

  return (
    <div className="max-w-3xl w-full mx-auto p-8 bg-white rounded-xl shadow-lg border border-[var(--color-muted)] border-opacity-20">
      <div className="flex justify-between items-center pb-6 mb-8 border-b border-[var(--color-muted)] border-opacity-30">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-on-background)]">Appearance Settings</h1>
          <p className="text-sm text-[var(--color-on-surface)] opacity-70 mt-1">
            Customize your brand's visual identity
          </p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            ✏️ Edit Appearance
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-6 p-3 rounded-md text-sm font-medium ${
            message.type === "success" ? "bg-[var(--color-success)] bg-opacity-10 text-[var(--color-on-success)]" : "bg-[var(--color-error)] bg-opacity-10 text-[var(--color-on-error)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* Color Palette */}
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Color Palette</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {colorFields.map(({ label, name }) => (
              <ColorInputField
                key={name}
                label={label}
                name={name as keyof Appearance}
                value={form[name as keyof Appearance] as string}
                editMode={editMode}
                onChange={handleChange}
              />
            ))}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Typography</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Font Family</label>
              {editMode ? (
                <select
                  name="fontFamily"
                  value={form.fontFamily}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-[var(--color-muted)] border-opacity-50 rounded-lg"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-4 py-2.5 bg-[var(--color-background)] rounded-lg">{appearance.fontFamily}</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70">Base Font Size</label>
              {editMode ? (
                <input
                  type="range"
                  name="baseFontSize"
                  min="12"
                  max="24"
                  value={form.baseFontSize || 16}
                  onChange={handleChange}
                />
              ) : (
                <div className="px-4 py-2.5 bg-[var(--color-background)] rounded-lg">{appearance.baseFontSize}px</div>
              )}
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-on-background)] mb-4">Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            {["roundedCorners", "darkMode"].map((key) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm font-medium text-[var(--color-on-surface)] opacity-70 capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
                {editMode ? (
                  <input
                    type="checkbox"
                    name={key}
                    checked={form[key as keyof Appearance] as boolean}
                    onChange={handleChange}
                    className="w-5 h-5"
                  />
                ) : (
                  <div className="px-4 py-2.5 bg-[var(--color-background)] rounded-lg">
                    {appearance[key as keyof Appearance] ? "Enabled" : "Disabled"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {editMode && (
          <div className="flex justify-end gap-3 pt-8 border-t border-[var(--color-muted)] border-opacity-30">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 text-[var(--color-on-surface)] opacity-80 bg-white border border-[var(--color-muted)] border-opacity-50 rounded-lg hover:bg-[var(--color-background)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2.5 text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Spinner theme="light" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
