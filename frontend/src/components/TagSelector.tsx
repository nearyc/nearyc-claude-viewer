import React, { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus, ChevronDown } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface TagSelectorProps {
  tags: string[];
  availableTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
  compact?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
  placeholder,
  maxTags = 10,
  compact = false,
}) => {
  const { t } = useTranslation();
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
        className={`flex flex-wrap rounded-lg border cursor-text ${compact ? 'gap-1.5 p-1.5 min-h-[34px]' : 'gap-2 p-2 min-h-[42px]'}`}
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
              className={`inline-flex items-center gap-1 rounded-md font-medium transition-all ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Tag className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(tag);
                }}
                className="ml-0.5 p-0.5 rounded hover:bg-white/10 transition-colors"
              >
                <X className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              </button>
            </span>
          );
        })}

        {canAddMore && (
          <div className={`flex items-center flex-1 ${compact ? 'min-w-[60px]' : 'min-w-[80px]'}`}>
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
              placeholder={tags.length === 0 ? placeholder || t('tag.add') : ''}
              className={`flex-1 bg-transparent outline-none ${compact ? 'text-xs min-w-[40px]' : 'text-sm min-w-[60px]'}`}
              style={{ color: 'var(--text-secondary)' }}
            />
            <ChevronDown
              className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''} ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
              style={{ color: 'var(--text-muted)' }}
            />
          </div>
        )}

        {!canAddMore && tags.length > 0 && (
          <span className={`${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--text-muted)' }}>
            {t('tag.maxTags', { maxTags })}
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
              {t('tag.createTag')}: &quot;{inputValue.trim()}&quot;
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
                {t('tag.existingTags')}
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
              {t('tag.createNewTag')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
