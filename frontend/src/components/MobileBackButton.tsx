import React, { useState, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';

export interface MobileBackButtonProps {
  /** Callback when back button is clicked */
  onClick?: () => void;
  /** Optional label text to display next to the icon */
  label?: string;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Mobile back button component
 * Provides a consistent back navigation experience on mobile devices
 * Includes touch feedback and safe area support for notched devices
 */
export const MobileBackButton: React.FC<MobileBackButtonProps> = ({
  onClick,
  label,
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`
        flex items-center gap-1 px-3 py-2 rounded-lg
        transition-all duration-200
        active:scale-95
        ${className}
      `}
      style={{
        backgroundColor: isPressed ? 'var(--bg-hover)' : 'transparent',
        color: 'var(--text-secondary)',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
      }}
      aria-label={label || 'Go back'}
    >
      <ChevronLeft
        className="w-5 h-5 transition-transform duration-200"
        style={{
          transform: isPressed ? 'translateX(-2px)' : 'translateX(0)',
        }}
      />
      {label && (
        <span className="text-sm font-medium">{label}</span>
      )}
    </button>
  );
};

export default MobileBackButton;
