import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiPlus, HiTrash } from 'react-icons/hi2';
import { Button } from '../../../../../common/ui/button';
import { Spinner } from '../../../../../common/ui/spinner';
import {
  BrandEvaluationItem,
  EvaluationStage,
  BrandEvaluationItemForm as FormData,
  createBrandEvaluationItem,
  updateBrandEvaluationItem,
} from '../../../../../shared/services/api/settings/brandEvaluationItems.setting.api';

interface BrandEvaluationItemsFormProps {
  item?: BrandEvaluationItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BrandEvaluationItemsForm({ 
  item, 
  onSuccess, 
  onCancel 
}: BrandEvaluationItemsFormProps) {
  const { brandId } = useParams<{ brandId: string }>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    parameter: '',
    requiredValue: '',
    sources: [''],
    stage: EvaluationStage.ONE,
    isActive: true,
    priority: 0,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setFormData({
        parameter: item.parameter,
        requiredValue: item.requiredValue,
        sources: item.sources.length > 0 ? item.sources : [''],
        stage: item.stage,
        isActive: item.isActive,
        priority: item.priority,
        description: item.description || '',
      });
    }
  }, [item]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.parameter.trim()) {
      newErrors.parameter = 'Parameter is required';
    }

    if (!formData.requiredValue.trim()) {
      newErrors.requiredValue = 'Required value is required';
    }

    const validSources = formData.sources.filter(source => source.trim());
    if (validSources.length === 0) {
      newErrors.sources = 'At least one source is required';
    }

    if ((formData.priority ?? 0) < 0) {
      newErrors.priority = 'Priority must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSourceChange = (index: number, value: string) => {
    const newSources = [...formData.sources];
    newSources[index] = value;
    handleInputChange('sources', newSources);
  };

  const addSource = () => {
    handleInputChange('sources', [...formData.sources, '']);
  };

  const removeSource = (index: number) => {
    if (formData.sources.length > 1) {
      const newSources = formData.sources.filter((_, i) => i !== index);
      handleInputChange('sources', newSources);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brandId || !validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Filter out empty sources
      const validSources = formData.sources.filter(source => source.trim());
      const submitData = {
        ...formData,
        sources: validSources,
        description: formData.description?.trim() || undefined,
      };
      
      if (item) {
        await updateBrandEvaluationItem(brandId, item.id, submitData);
        toast.success('Evaluation item updated successfully');
      } else {
        await createBrandEvaluationItem(brandId, submitData);
        toast.success('Evaluation item created successfully');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error saving evaluation item:', error);
      toast.error(error?.response?.data?.message || 'Failed to save evaluation item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--border)] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {item ? 'Edit Evaluation Item' : 'Create New Evaluation Item'}
        </h2>
        <p className="text-[var(--muted-foreground)] mt-1">
          {item ? 'Update the evaluation criteria below' : 'Add a new evaluation criteria for your brand'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parameter */}
        <div>
          <label htmlFor="parameter" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Parameter *
          </label>
          <input
            id="parameter"
            type="text"
            value={formData.parameter}
            onChange={(e) => handleInputChange('parameter', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)] ${
              errors.parameter ? 'border-red-500' : 'border-[var(--border)]'
            }`}
            placeholder="e.g., Credit Score, Monthly Income"
            disabled={loading}
          />
          {errors.parameter && (
            <p className="mt-1 text-sm text-red-600">{errors.parameter}</p>
          )}
        </div>

        {/* Required Value */}
        <div>
          <label htmlFor="requiredValue" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Required Value *
          </label>
          <input
            id="requiredValue"
            type="text"
            value={formData.requiredValue}
            onChange={(e) => handleInputChange('requiredValue', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)] ${
              errors.requiredValue ? 'border-red-500' : 'border-[var(--border)]'
            }`}
            placeholder="e.g., >=650, >50000"
            disabled={loading}
          />
          {errors.requiredValue && (
            <p className="mt-1 text-sm text-red-600">{errors.requiredValue}</p>
          )}
        </div>

        {/* Sources */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Sources *
          </label>
          <div className="space-y-2">
            {formData.sources.map((source, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={source}
                  onChange={(e) => handleSourceChange(index, e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)] ${
                    errors.sources ? 'border-red-500' : 'border-[var(--border)]'
                  }`}
                  placeholder="e.g., Credit Score, Experian, Internal API"
                  disabled={loading}
                />
                {formData.sources.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSource(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                    disabled={loading}
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSource}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-[var(--primary)] border border-[var(--primary)] rounded-md hover:bg-[var(--primary)] hover:bg-opacity-5"
            disabled={loading}
          >
            <HiPlus className="w-4 h-4" />
            Add Source
          </button>
          {errors.sources && (
            <p className="mt-1 text-sm text-red-600">{errors.sources}</p>
          )}
        </div>

        {/* Stage, Priority, Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Stage
            </label>
            <select
              id="stage"
              value={formData.stage}
              onChange={(e) => handleInputChange('stage', e.target.value as EvaluationStage)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              disabled={loading}
            >
              <option value={EvaluationStage.ONE}>Stage One</option>
              <option value={EvaluationStage.TWO}>Stage Two</option>
              <option value={EvaluationStage.THREE}>Stage Three</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Priority
            </label>
            <input
              id="priority"
              type="number"
              min="0"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)] ${
                errors.priority ? 'border-red-500' : 'border-[var(--border)]'
              }`}
              disabled={loading}
            />
            {errors.priority && (
              <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
            )}
          </div>

          <div>
            <label htmlFor="isActive" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Status
            </label>
            <select
              id="isActive"
              value={(formData.isActive ?? true).toString()}
              onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              disabled={loading}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:ring-[var(--primary)] focus:border-[var(--primary)]"
            placeholder="Optional description for this evaluation criteria"
            disabled={loading}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner theme="dark" />
                <span className="ml-2">
                  {item ? 'Updating...' : 'Creating...'}
                </span>
              </>
            ) : (
              <span>{item ? 'Update Item' : 'Create Item'}</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
