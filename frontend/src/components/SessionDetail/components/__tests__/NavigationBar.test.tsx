import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationBar } from '../NavigationBar';

describe('NavigationBar', () => {
  const defaultProps = {
    bookmarksCount: 0,
    isSearchOpen: false,
    isAtBottom: true,
    onScrollToTop: vi.fn(),
    onScrollToBottom: vi.fn(),
    onScrollToPrevUserInput: vi.fn(),
    onScrollToNextUserOutput: vi.fn(),
    onToggleSearch: vi.fn(),
    onJumpToBookmark: vi.fn(),
  };

  it('should render navigation buttons', () => {
    render(<NavigationBar {...defaultProps} />);
    expect(screen.getByTitle('Scroll to top')).toBeInTheDocument();
    expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument();
    expect(screen.getByTitle('Scroll to previous user input')).toBeInTheDocument();
    expect(screen.getByTitle('Scroll to next AI output')).toBeInTheDocument();
    expect(screen.getByTitle('Search in conversation')).toBeInTheDocument();
    expect(screen.getByTitle('Jump to bookmarks')).toBeInTheDocument();
  });

  it('should call onScrollToTop when clicking Top button', () => {
    render(<NavigationBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Scroll to top'));
    expect(defaultProps.onScrollToTop).toHaveBeenCalled();
  });

  it('should call onScrollToBottom when clicking Bottom button', () => {
    render(<NavigationBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Scroll to bottom'));
    expect(defaultProps.onScrollToBottom).toHaveBeenCalled();
  });

  it('should call onToggleSearch when clicking Search button', () => {
    render(<NavigationBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Search in conversation'));
    expect(defaultProps.onToggleSearch).toHaveBeenCalled();
  });

  it('should show bookmarks count', () => {
    render(<NavigationBar {...defaultProps} bookmarksCount={5} />);
    expect(screen.getByText('Bookmarks (5)')).toBeInTheDocument();
  });

  it('should show new messages button when not at bottom', () => {
    render(<NavigationBar {...defaultProps} isAtBottom={false} />);
    expect(screen.getByText('New messages')).toBeInTheDocument();
  });

  it('should not show new messages button when at bottom', () => {
    render(<NavigationBar {...defaultProps} isAtBottom={true} />);
    expect(screen.queryByText('New messages')).not.toBeInTheDocument();
  });

  it('should highlight search button when search is open', () => {
    render(<NavigationBar {...defaultProps} isSearchOpen={true} />);
    const searchButton = screen.getByTitle('Search in conversation');
    expect(searchButton.className).toContain('bg-blue-600/20');
  });
});
