import DynamicFilters, {
  FilterGroup,
} from "../../../common/filter/dynamicFilters";
import {  ReloanStatus } from "../../../constant/enum";

export const Filters = () => {
  const filterGroups: FilterGroup[] = [
    {
      id: "dateFilter",
      title: "Quick Date Filter",
      type: "radio",
      options: [
        {
          label: "All Time",
          count: null,
          value: "all",
        },
        {
          label: "Today",
          count: null,
          value: "today",
        },
        {
          label: "Yesterday",
          count: null,
          value: "yesterday",
        },
        {
          label: "Last 7 Days",
          count: null,
          value: "last_7_days",
        },
        {
          label: "Last 30 Days",
          count: null,
          value: "last_30_days",
        },
        {
          label: "Last 90 Days",
          count: null,
          value: "last_90_days",
        },
      ],
    },
    {
      id: "kycStatus",
      title: "KYC Status",
      type: "checkbox",
      options: [
        { label: " kycPending", value: "kycPending", count: null },
        { label: " kycCompleted", value: "kycCompleted", count: null },
      ],
    },
    {
      id: "userReloanStatus",
      title: "Reloan Status",
      type: "checkbox",
      options: Object.values(ReloanStatus).map((status) => ({
        label: status,
        value: status,
        count: null,
      })),
    },
  ];

  return (
    <div >
      <DynamicFilters
        filterGroups={filterGroups}
        resetText="Reset Filters"
        storageKey="customersListFilters"
        showDateRange={false }
        dateRangeTitle="Custom Date Range"
      />
    </div>
  );
};