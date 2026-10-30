import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';

const ROUTE_EVENT = 'app:navigate';

export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    window.addEventListener(ROUTE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(ROUTE_EVENT, sync);
    };
  }, []);

  return pathname;
}

export function navigate(path: string, options?: { replace?: boolean }) {
  if (options?.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

interface LinkProps {
  to: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}

export function Link({ to, className, children, onNavigate }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(to);
    onNavigate?.();
  };
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
