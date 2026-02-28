import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { HiHome, HiChevronRight } from 'react-icons/hi';

// Moved outside component to prevent re-allocation on every render
const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'customers': 'Customers',
  'loans': 'Loans',
  'completed': 'Completed',
  'loans-ops': 'Operations',
  'sanction-manager': 'Manager',
};

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const { brandId, customerId } = useParams();

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const list: { label: string; path: string; isLast: boolean }[] = [];

    // Base entry
    if (brandId) {
      list.push({ label: 'Home', path: `/${brandId}/dashboard`, isLast: segments.length <= 2 });
    }

    let accPath = `/${brandId}`;
    segments.forEach((seg, i) => {
      // Skip ID segments and the root dashboard to save UI space
      if (seg === brandId || seg === 'dashboard' || seg === customerId) return;

      accPath += `/${seg}`;
      const label = ROUTE_LABELS[seg] || seg.replace(/-/g, ' ');
      
      list.push({
        label: seg === 'customers' && customerId ? 'Customer Details' : label,
        path: accPath,
        isLast: i === segments.length - 1
      });
    });

    return list;
  }, [pathname, brandId, customerId]);

  if (breadcrumbs.length < 2) return null;

  return (
    <nav className="flex items-center px-4 py-1.5 h-9 overflow-hidden" aria-label="Breadcrumb">
      <ol className="flex items-center text-xs font-medium whitespace-nowrap">
        {breadcrumbs.map((item, idx) => (
          <li key={item.path} className="flex items-center">
            {idx > 0 && <HiChevronRight className="mx-1.5 opacity-40 shrink-0" />}
            
            {item.isLast ? (
              <span className="text-[var(--color-on-surface)] truncate max-w-[120px] sm:max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="flex items-center opacity-60 hover:opacity-100 transition-opacity"
              >
                {idx === 0 && <HiHome className="mr-1 shrink-0" />}
                <span className="truncate max-w-[80px] sm:max-w-none">{item.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;