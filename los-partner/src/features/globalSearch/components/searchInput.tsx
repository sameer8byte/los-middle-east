import React from "react";

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSearch: () => void;
  readonly loading?: boolean;
  readonly placeholder?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  onSearch, 
  loading = false, 
  placeholder = "Search..." 
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      />
      <button
        onClick={onSearch}
        disabled={loading || !value.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Searching..." : "Search"}
      </button>
    </div>
  );
}