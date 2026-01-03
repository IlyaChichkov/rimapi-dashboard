// src/hooks/useCardDeleteShortcut.ts
import { useState, useEffect } from 'react';

export const useCardDeleteShortcut = (onRemove?: () => void) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + Delete while hovered
      if (isHovered && e.ctrlKey && (e.key === 'Delete' || e.key === 'Del')) {
        if (onRemove) {
          e.preventDefault();
          onRemove();
        }
      }
    };

    if (isHovered) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovered, onRemove]);

  return {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };
};