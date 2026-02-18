import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render empty state message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Select a session to view details')).toBeInTheDocument();
  });

  it('should render message icon', () => {
    const { container } = render(<EmptyState />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<EmptyState />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('flex');
    expect(root.className).toContain('h-full');
    expect(root.className).toContain('items-center');
    expect(root.className).toContain('justify-center');
  });
});
