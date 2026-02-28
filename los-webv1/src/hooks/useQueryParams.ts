import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useQueryParams() {
  const navigate = useNavigate();
  const location = useLocation();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setQuery = (key: string, value: string) => {
    const updatedQuery = new URLSearchParams(location.search);
    updatedQuery.set(key, value);
    navigate(`${location.pathname}?${updatedQuery.toString()}`, { replace: true });
  };


  const removeQuery = (param:string) => {

  
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete(param);
  
    navigate({
      pathname: location.pathname,
      search: searchParams.toString(),
    }, { replace: true });
  };
  

  const getQuery = (key: string): string | null => {
    return query.get(key);
  };

  return { setQuery, removeQuery, getQuery, query };
}
