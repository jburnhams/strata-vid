import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  options: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, options }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let newTop = y;
      let newLeft = x;

      // Check bottom edge
      if (y + rect.height > viewportHeight) {
        newTop = Math.max(0, y - rect.height);
      }

      // Check right edge
      if (x + rect.width > viewportWidth) {
        newLeft = Math.max(0, x - rect.width);
      }

      setPosition({ top: newTop, left: newLeft });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use mousedown to capture click before it triggers other things
    document.addEventListener('mousedown', handleClickOutside);
    // Also close on scroll to avoid floating menu
    document.addEventListener('scroll', onClose, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded shadow-xl py-1 min-w-[150px]"
      style={{ top: position.top, left: position.left }}
      role="menu"
    >
      {options.map((option, index) => (
        <button
          key={index}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 transition-colors ${
            option.danger ? 'text-red-400' : 'text-gray-200'
          } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={(e) => {
             if (option.disabled) return;
             e.stopPropagation();
             option.onClick();
             onClose();
          }}
          disabled={option.disabled}
          role="menuitem"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
