/**
 * Mobile Bottom Navigation
 *
 * Thumb-friendly navigation optimized for South African security industry users
 *
 * Features:
 * - 48px minimum tap targets (SA standard with screen protectors)
 * - Auto-hide on scroll down, show on scroll up
 * - Active state indicators
 * - Optimized for one-handed use
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number; // Optional notification badge
}

export interface MobileBottomNavProps {
  items: NavItem[];
  className?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items,
  className = '',
}) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        // Always show at top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide
        setIsVisible(false);
      } else {
        // Scrolling up - show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white border-t-2 border-gray-200
        shadow-2xl
        transition-transform duration-300
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        md:hidden
        ${className}
      `}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)', // iOS safe area
      }}
    >
      <div className="flex items-center justify-around h-20">
        {items.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[64px] min-h-[48px]
                px-3 py-2
                transition-all duration-200
                ${
                  active
                    ? 'text-primary-500'
                    : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {/* Icon */}
              <div
                className={`
                  flex items-center justify-center
                  w-8 h-8 mb-1
                  transition-transform duration-200
                  ${active ? 'scale-110' : 'scale-100'}
                `}
              >
                {item.icon}
              </div>

              {/* Label */}
              <span
                className={`
                  text-xs font-medium
                  ${active ? 'font-semibold' : ''}
                `}
              >
                {item.label}
              </span>

              {/* Active Indicator */}
              {active && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full" />
              )}

              {/* Badge */}
              {item.badge && item.badge > 0 && (
                <div className="absolute top-1 right-1 bg-danger-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

// Pre-defined icon components (can be replaced with your icon library)
export const HomeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

export const CalendarIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

export const MarketplaceIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
  </svg>
);

export const ChartIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

export const UserIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);
