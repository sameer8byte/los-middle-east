import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useQueryParams() {
  const navigate = useNavigate();
  const location = useLocation();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setQuery = (key: string, value: string) => {
    const updatedQuery = new URLSearchParams(location.search);
    updatedQuery.set(key, value);

    navigate({
      pathname: location.pathname,
      search: updatedQuery.toString(),
    }, { replace: true });
  };

  const setMultipleQueries = (queries: Record<string, string>) => {
    const updatedQuery = new URLSearchParams(location.search);
    
    Object.entries(queries).forEach(([key, value]) => {
      updatedQuery.set(key, value);
    });

    navigate({
      pathname: location.pathname,
      search: updatedQuery.toString(),
    }, { replace: true });
  };

  const removeQuery = (param: string) => {
    const updatedQuery = new URLSearchParams(location.search);
    updatedQuery.delete(param);

    navigate({
      pathname: location.pathname,
      search: updatedQuery.toString(),
    }, { replace: true });
  };

  const getQuery = (key: string): string | null => {
    return query.get(key);
  };

  return { setQuery, setMultipleQueries, removeQuery, getQuery, query };
}
