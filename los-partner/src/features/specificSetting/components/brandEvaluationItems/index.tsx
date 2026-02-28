import { useState } from 'react';
import { 
  BrandEvaluationItemsList, 
  BrandEvaluationItemsForm, 
  BulkUploadSection 
} from './components';

export const brandEvaluationItems = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'upload'>('list');
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleItemChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setActiveTab('list');
    handleItemChange();
  };

  const handleUploadSuccess = () => {
    setActiveTab('list');
    handleItemChange();
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setActiveTab('create');
  };

  const handleEditSuccess = () => {
    setEditingItem(null);
    setActiveTab('list');
    handleItemChange();
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setActiveTab('list');
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Brand Evaluation Items
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Manage evaluation criteria and upload bulk data through CSV files
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
            }`}
          >
            Evaluation Items
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
            }`}
          >
            Create Item
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
            }`}
          >
            Bulk Upload
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <BrandEvaluationItemsList 
          refreshTrigger={refreshTrigger}
          onItemChange={handleItemChange}
          onEditItem={handleEditItem}
        />
      )}
      
      {activeTab === 'create' && (
        <BrandEvaluationItemsForm 
          item={editingItem}
          onSuccess={editingItem ? handleEditSuccess : handleCreateSuccess}
          onCancel={editingItem ? handleEditCancel : () => setActiveTab('list')}
        />
      )}
      
      {activeTab === 'upload' && (
        <BulkUploadSection onUploadSuccess={handleUploadSuccess} />
      )}
    </div>
  );
};
