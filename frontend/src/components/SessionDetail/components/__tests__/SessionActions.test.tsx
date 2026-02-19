import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionActions } from '../SessionActions';

// Mock the translation hook
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'session.customName.add': 'Add Custom Name',
        'session.customName.edit': 'Edit Name',
        'session.customName.placeholder': 'Enter session name...',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

describe('SessionActions', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    customName: null,
    hasCustomName: false,
    onSetName: vi.fn(),
  };

  it('should show "Add Custom Name" button when no custom name', () => {
    render(<SessionActions {...defaultProps} />);
    expect(screen.getByText('Add Custom Name')).toBeInTheDocument();
  });

  it('should show "Edit Name" button when hasCustomName is true', () => {
    render(<SessionActions {...defaultProps} customName="My Session" hasCustomName={true} />);
    expect(screen.getByText('Edit Name')).toBeInTheDocument();
  });

  it('should enter edit mode when clicking the edit button', () => {
    render(<SessionActions {...defaultProps} />);
    const editButton = screen.getByTitle('Add Custom Name');
    fireEvent.click(editButton);
    expect(screen.getByPlaceholderText('Enter session name...')).toBeInTheDocument();
  });

  it('should save name when pressing Enter', () => {
    render(<SessionActions {...defaultProps} />);
    const editButton = screen.getByTitle('Add Custom Name');
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText('Enter session name...');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSetName).toHaveBeenCalledWith('test-session-123', 'New Name');
  });

  it('should cancel edit when pressing Escape', () => {
    render(<SessionActions {...defaultProps} />);
    const editButton = screen.getByTitle('Add Custom Name');
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText('Enter session name...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByPlaceholderText('Enter session name...')).not.toBeInTheDocument();
  });
});
