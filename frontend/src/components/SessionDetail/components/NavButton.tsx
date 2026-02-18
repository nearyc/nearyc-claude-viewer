import React from 'react';

interface NavButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title: string;
  isActive?: boolean;
}

export const NavButton: React.FC<NavButtonProps> = ({ onClick, icon, label, title, isActive }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all ${
      isActive
        ? 'bg-blue-600/20 text-blue-400'
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
