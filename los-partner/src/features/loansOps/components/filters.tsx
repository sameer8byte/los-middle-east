import DynamicFilters, { FilterGroup } from "../../../common/filter/dynamicFilters";

export const Filters = () => {
  const filterGroups: FilterGroup[] = [
    {
      id: "dateFilter",
      title: "Created At",
      type: "radio",
      options: [
        { label: "All Time", value: "all", count: null },
        { label: "Today", value: "today", count: null },
        { label: "Yesterday", value: "yesterday", count: null },
        { label: "Last 7 Days", value: "last_7_days", count: null },
        { label: "Last 30 Days", value: "last_30_days", count: null },
        { label: "Last 90 Days", value: "last_90_days", count: null },
      ],
    },
  ];

  return (
    <div>
      <DynamicFilters
        filterGroups={filterGroups}
        resetText="Reset Filters"
        storageKey="loansOpsFilters"
      />
    </div>
  );
};
