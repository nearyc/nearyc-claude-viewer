import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionActions } from '../SessionActions';

describe('SessionActions', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    customName: null,
    hasCustomName: false,
    tags: [],
    availableTags: [],
    onSetName: vi.fn(),
    onAddTag: vi.fn(),
    onRemoveTag: vi.fn(),
  };

  it('should show "收藏" button when no custom name', () => {
    render(<SessionActions {...defaultProps} />);
    expect(screen.getByText('收藏')).toBeInTheDocument();
  });

  it('should show custom name when hasCustomName is true', () => {
    render(<SessionActions {...defaultProps} customName="My Session" hasCustomName={true} />);
    expect(screen.getByText('My Session')).toBeInTheDocument();
  });

  it('should enter edit mode when clicking the name button', () => {
    render(<SessionActions {...defaultProps} />);
    const nameButton = screen.getByTitle('添加自定义名称');
    fireEvent.click(nameButton);
    expect(screen.getByPlaceholderText('输入自定义名称...')).toBeInTheDocument();
  });

  it('should save name when pressing Enter', () => {
    render(<SessionActions {...defaultProps} />);
    const nameButton = screen.getByTitle('添加自定义名称');
    fireEvent.click(nameButton);

    const input = screen.getByPlaceholderText('输入自定义名称...');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onSetName).toHaveBeenCalledWith('test-session-123', 'New Name');
  });

  it('should cancel edit when pressing Escape', () => {
    render(<SessionActions {...defaultProps} />);
    const nameButton = screen.getByTitle('添加自定义名称');
    fireEvent.click(nameButton);

    const input = screen.getByPlaceholderText('输入自定义名称...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByPlaceholderText('输入自定义名称...')).not.toBeInTheDocument();
  });

  it('should show tags section', () => {
    render(<SessionActions {...defaultProps} />);
    expect(screen.getByText('标签')).toBeInTheDocument();
  });
});
