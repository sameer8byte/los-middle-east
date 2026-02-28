
import { Button } from "../ui/button";
import { useAppDispatch } from "../../shared/redux/store";
import { toggleFiltersVisible } from "../../shared/redux/slices/common";
import { LuFilter } from "react-icons/lu";

export function FilterButton() {
    const dispatch = useAppDispatch();
    const isFiltersVisible = window.location.hash === "#filters";

    const handleToggleFilters = () => {
        dispatch(toggleFiltersVisible());
    };

    return (
        <Button 
            onClick={handleToggleFilters} 
            style={{
               
                backgroundColor: isFiltersVisible ? 'var(--primary)' : 'var(--surface)',
                color: isFiltersVisible ? 'var(--primary-contrast)' : 'var(--on-surface)'
            }}
        >
            <LuFilter className="text-lg" />
            <span>Filters</span>
        </Button>
    );
}
