import React, { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus, ChevronDown } from 'lucide-react';

interface TagSelectorProps {
  tags: string[];
  availableTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
  placeholder = '添加标签...',
  maxTags = 10,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAvailableTags = availableTags
    .filter((tag) => !tags.includes(tag))
    .filter((tag) =>
      inputValue ? tag.toLowerCase().includes(inputValue.toLowerCase()) : true
    )
    .slice(0, 10);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onAddTag(inputValue.trim());
      setInputValue('');
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleAddTag = (tag: string) => {
    onAddTag(tag);
    setInputValue('');
    inputRef.current?.focus();
  };

  const canAddMore = tags.length < maxTags;

  // Tag color mapping for visual variety
  const getTagColor = (tag: string): { bg: string; text: string; border: string } => {
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
      { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
      { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
      { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
      { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
      { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
      { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' },
      { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
    ];
    const index = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Tags Display */}
      <div
        className="flex flex-wrap gap-2 p-2 rounded-lg border min-h-[42px] cursor-text"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: isOpen ? 'var(--accent-blue)' : 'var(--border-primary)',
        }}
        onClick={() => {
          if (canAddMore) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
      >
        {tags.map((tag) => {
          const colors = getTagColor(tag);
          return (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Tag className="w-3 h-3" />
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(tag);
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        {canAddMore && (
          <div className="flex items-center flex-1 min-w-[80px]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="flex-1 bg-transparent text-sm outline-none min-w-[60px]"
              style={{ color: 'var(--text-secondary)' }}
            />
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-muted)' }}
            />
          </div>
        )}

        {!canAddMore && tags.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            最多 {maxTags} 个标签
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && canAddMore && (
        <div
          className="absolute z-50 w-full mt-1 py-1 rounded-lg border shadow-lg max-h-48 overflow-auto"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {inputValue.trim() && !tags.includes(inputValue.trim().toLowerCase()) && (
            <button
              onClick={() => handleAddTag(inputValue.trim())}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Plus className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
              创建标签 &quot;{inputValue.trim()}&quot;
            </button>
          )}

          {filteredAvailableTags.length > 0 && (
            <>
              {inputValue.trim() && !tags.includes(inputValue.trim().toLowerCase()) && (
                <div
                  className="mx-3 my-1 border-t"
                  style={{ borderColor: 'var(--border-primary)' }}
                />
              )}
              <div className="px-3 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                已有标签
              </div>
              {filteredAvailableTags.map((tag) => {
                const colors = getTagColor(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {filteredAvailableTags.length === 0 && !inputValue.trim() && (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              输入创建新标签
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
