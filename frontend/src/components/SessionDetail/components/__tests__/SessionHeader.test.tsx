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
      };
      return translations[key] || key;
    },
  }),
}));

describe('SessionHeader', () => {
  const defaultProps = {
    isUpdating: false,
  };

  it('should render session details title', () => {
    render(<SessionHeader {...defaultProps} />);
    expect(screen.getByText('Session Details')).toBeInTheDocument();
  });

  it('should show updating indicator when isUpdating is true', () => {
    render(<SessionHeader isUpdating={true} />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('should not show updating indicator when isUpdating is false', () => {
    render(<SessionHeader {...defaultProps} />);
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
  });
});
