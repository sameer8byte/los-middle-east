import DynamicFilters, {
  FilterGroup,
} from "../../../common/filter/dynamicFilters";
import { AgreementStatusEnum } from "../../../constant/enum";

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
    }
    ,
            {
                id:'loanAgreementStatus',
                title: "Loan Agreement Status",
                type: "checkbox",
                options:Object.values([
                    AgreementStatusEnum.NOT_SENT,
                    AgreementStatusEnum.SENT,
                    AgreementStatusEnum.SIGNED,
                    AgreementStatusEnum.REJECTED,
                ]).map((status) => ({
                    label: status,
                    value: status,
                    count: null,
                })),
            }
   
    
  ];

  return (
    <div>
      <DynamicFilters
        filterGroups={filterGroups}
        resetText="Reset Filters"
        storageKey="loanSanctionManagerFilters"
      />
    </div>
  );
};
