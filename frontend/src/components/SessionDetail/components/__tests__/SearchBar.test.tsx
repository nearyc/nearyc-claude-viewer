import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    searchQuery: '',
    matchCount: 0,
    currentMatchIndex: 0,
    onSearchChange: vi.fn(),
    onNavigatePrev: vi.fn(),
    onNavigateNext: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render search input', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search in conversation...')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByPlaceholderText('Search in conversation...');
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test query');
  });

  it('should show match count when there are matches', () => {
    render(<SearchBar {...defaultProps} searchQuery="test" matchCount={5} currentMatchIndex={2} />);
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('should show "No matches" when search query exists but no matches', () => {
    render(<SearchBar {...defaultProps} searchQuery="test" matchCount={0} />);
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('should show navigation buttons when there are matches', () => {
    render(<SearchBar {...defaultProps} matchCount={3} />);
    expect(screen.getByTitle('Previous match')).toBeInTheDocument();
    expect(screen.getByTitle('Next match')).toBeInTheDocument();
  });

  it('should call onNavigatePrev when clicking previous button', () => {
    render(<SearchBar {...defaultProps} matchCount={3} />);
    fireEvent.click(screen.getByTitle('Previous match'));
    expect(defaultProps.onNavigatePrev).toHaveBeenCalled();
  });

  it('should call onNavigateNext when clicking next button', () => {
    render(<SearchBar {...defaultProps} matchCount={3} />);
    fireEvent.click(screen.getByTitle('Next match'));
    expect(defaultProps.onNavigateNext).toHaveBeenCalled();
  });

  it('should call onClose when clicking close button', () => {
    render(<SearchBar {...defaultProps} />);
    // Get all buttons and find the one with X icon (close button is the last button)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[buttons.length - 1];
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
