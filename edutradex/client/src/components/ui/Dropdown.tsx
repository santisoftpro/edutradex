'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  contentClassName?: string;
}

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
  contentClassName,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              'absolute top-full mt-2 bg-slate-700 rounded-lg shadow-lg border border-slate-600 z-20 overflow-hidden',
              align === 'right' ? 'right-0' : 'left-0',
              contentClassName
            )}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  variant?: 'default' | 'danger';
}

export function DropdownItem({
  children,
  onClick,
  href,
  className,
  variant = 'default',
}: DropdownItemProps) {
  const baseStyles = 'flex items-center gap-2 px-4 py-2 text-left transition-colors w-full';
  const variantStyles = {
    default: 'text-slate-300 hover:bg-slate-600',
    danger: 'text-red-400 hover:bg-slate-600',
  };

  const combinedClassName = cn(baseStyles, variantStyles[variant], className);

  if (href) {
    return (
      <a href={href} className={combinedClassName}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={combinedClassName}>
      {children}
    </button>
  );
}

interface DropdownDividerProps {
  className?: string;
}

export function DropdownDivider({ className }: DropdownDividerProps) {
  return <div className={cn('border-t border-slate-600', className)} />;
}

interface DropdownHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownHeader({ children, className }: DropdownHeaderProps) {
  return (
    <div className={cn('px-4 py-2 border-b border-slate-600', className)}>
      {children}
    </div>
  );
}
