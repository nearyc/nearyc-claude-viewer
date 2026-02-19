import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionHeader } from '../SessionHeader';

// Mock the translation hook
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'session.sessionDetails': 'Session Details',
        'session.updating': 'Updating...',
        'session.customName.star': 'Star Session',
        'session.customName.edit': 'Edit Name',
        'tag.add': 'Add Tag',
      };
      return translations[key] || key;
    },
  }),
}));

describe('SessionHeader', () => {
  const defaultProps = {
    isUpdating: false,
    isStarred: false,
    customName: undefined,
    tags: [] as string[],
    availableTags: [] as string[],
    onToggleStar: vi.fn(),
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
  };

  it('should render session details title', () => {
    render(<SessionHeader {...defaultProps} />);
    expect(screen.getByText('Session Details')).toBeInTheDocument();
  });

  it('should show updating indicator when isUpdating is true', () => {
    render(<SessionHeader {...defaultProps} isUpdating={true} />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('should not show updating indicator when isUpdating is false', () => {
    render(<SessionHeader {...defaultProps} isUpdating={false} />);
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
  });

  it('should show star button', () => {
    render(<SessionHeader {...defaultProps} />);
    expect(screen.getByText('Star Session')).toBeInTheDocument();
  });

  it('should show custom name when starred', () => {
    render(<SessionHeader {...defaultProps} isStarred={true} customName="My Session" />);
    expect(screen.getByText('My Session')).toBeInTheDocument();
  });
});
