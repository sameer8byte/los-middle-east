import { FiSearch } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";

const SearchInput = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") || "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> & {
      target: { value: string };
    }
  ) => {
    const newQuery = e.target.value;
    if (newQuery) {
      searchParams.set("query", newQuery);
    } else {
      searchParams.delete("query");
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="relative w-full sm:w-80">
      <input
        type="text"
        placeholder="Search..."
        className="pl-10 pr-4 py-2 w-full rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        value={query}
        onChange={handleChange}
      />
      <FiSearch className="h-5 w-5 text-[var(--muted-foreground)] absolute left-3 top-2.5" />
    </div>
  );
};

export default SearchInput;
