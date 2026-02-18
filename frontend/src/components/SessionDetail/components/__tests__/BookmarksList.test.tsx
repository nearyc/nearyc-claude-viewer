import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookmarksList } from '../BookmarksList';
import type { ChatMessage } from '../../../../types';

const mockMessages: ChatMessage[] = [
  { uuid: '1', role: 'user', content: 'Hello world message', timestamp: 1000 },
  { uuid: '2', role: 'assistant', content: 'Assistant response here', timestamp: 2000 },
];

describe('BookmarksList', () => {
  const defaultProps = {
    bookmarks: [] as string[],
    messages: mockMessages,
    onJumpToBookmark: vi.fn(),
  };

  it('should return null when no bookmarks', () => {
    const { container } = render(<BookmarksList {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render bookmarks section when there are bookmarks', () => {
    render(<BookmarksList {...defaultProps} bookmarks={['1']} />);
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
  });

  it('should render bookmark preview for user message', () => {
    render(<BookmarksList {...defaultProps} bookmarks={['1']} />);
    expect(screen.getByText('You: Hello world message')).toBeInTheDocument();
  });

  it('should render bookmark preview for assistant message', () => {
    render(<BookmarksList {...defaultProps} bookmarks={['2']} />);
    expect(screen.getByText('Claude: Assistant response here')).toBeInTheDocument();
  });

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(100);
    const messagesWithLongContent = [
      { uuid: '3', role: 'user' as const, content: longMessage, timestamp: 3000 },
    ];
    render(
      <BookmarksList
        {...defaultProps}
        bookmarks={['3']}
        messages={messagesWithLongContent}
      />
    );
    expect(screen.getByText(`You: ${'a'.repeat(40)}...`)).toBeInTheDocument();
  });

  it('should call onJumpToBookmark when clicking a bookmark', () => {
    render(<BookmarksList {...defaultProps} bookmarks={['1']} />);
    fireEvent.click(screen.getByText('You: Hello world message'));
    expect(defaultProps.onJumpToBookmark).toHaveBeenCalledWith('1');
  });

  it('should not render bookmarks for non-existent messages', () => {
    const { container } = render(
      <BookmarksList {...defaultProps} bookmarks={['non-existent']} />
    );
    // Should only show the header, no bookmark buttons
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('should render multiple bookmarks', () => {
    render(<BookmarksList {...defaultProps} bookmarks={['1', '2']} />);
    expect(screen.getByText('You: Hello world message')).toBeInTheDocument();
    expect(screen.getByText('Claude: Assistant response here')).toBeInTheDocument();
  });
});
