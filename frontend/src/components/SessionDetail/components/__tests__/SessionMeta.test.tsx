import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionMeta } from '../SessionMeta';

describe('SessionMeta', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    project: '/path/to/project',
    updatedAt: Date.now(),
    inputCount: 5,
    messageCount: 10,
    hasFullConversation: true,
    onExport: vi.fn(),
  };

  it('should render session ID', () => {
    render(<SessionMeta {...defaultProps} />);
    expect(screen.getByText('Session ID')).toBeInTheDocument();
    expect(screen.getByText('test-session-123')).toBeInTheDocument();
  });

  it('should render project path', () => {
    render(<SessionMeta {...defaultProps} />);
    expect(screen.getByText('Project')).toBeInTheDocument();
    expect(screen.getByText('/path/to/project')).toBeInTheDocument();
  });

  it('should show message count when hasFullConversation is true', () => {
    render(<SessionMeta {...defaultProps} />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should show input count when hasFullConversation is false', () => {
    render(<SessionMeta {...defaultProps} hasFullConversation={false} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show Last Active', () => {
    render(<SessionMeta {...defaultProps} />);
    expect(screen.getByText('Last Active')).toBeInTheDocument();
  });

  it('should call onExport when export button is clicked', () => {
    render(<SessionMeta {...defaultProps} />);
    const exportButton = screen.getByTitle('导出会话');
    fireEvent.click(exportButton);
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('should copy session ID when copy button is clicked', async () => {
    const clipboardMock = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardMock,
      },
    });

    render(<SessionMeta {...defaultProps} />);
    const copyButton = screen.getByTitle('复制 Session ID');
    fireEvent.click(copyButton);

    expect(clipboardMock).toHaveBeenCalledWith('test-session-123');
  });
});
