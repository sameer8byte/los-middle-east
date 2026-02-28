import DynamicFilters, {
    FilterGroup,
} from "../../../common/filter/dynamicFilters";
// import { LoanStatusEnum } from "../../../constant/enum";
 
export const Filters = () => {
    const filterGroups: FilterGroup[] = [
        {
            id: "dateFilter",
            title: "Created At",
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
 
    ];

    return (
        <div>
            <DynamicFilters
                filterGroups={filterGroups}
                resetText="Reset Filters"
                
                storageKey="loanCreditExecutiveFilters"
            />
        </div>
    );
};
