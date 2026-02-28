import DynamicFilters, {
    FilterGroup,
} from "../../../common/filter/dynamicFilters";
import { LoanStatusEnum } from "../../../constant/enum";
 
export const Filters = () => {
    const filterGroups: FilterGroup[] = [
        {
            id: "dateFilter",
            title: "Due Date",
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
            id: "status",
            title: "Status",
            type: "checkbox",
            options: Object.values([
                LoanStatusEnum.ACTIVE,
                LoanStatusEnum.PARTIALLY_PAID,
            ]).map((status) => ({
                label: status,
                value: status,
                count: null,
            })),
        },
   
    ];

    return (
        <div className="mt-5">
            <DynamicFilters
                filterGroups={filterGroups}
                resetText="Reset Filters"
                storageKey="loanCollectionFilters"
                showDateRange={true}
                dateRangeTitle="Custom Date Range"
            />
        </div>
    );
};
