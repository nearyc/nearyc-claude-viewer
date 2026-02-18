import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionHeader } from '../SessionHeader';

describe('SessionHeader', () => {
  it('should render session details title', () => {
    render(<SessionHeader />);
    expect(screen.getByText('Session Details')).toBeInTheDocument();
  });

  it('should show updating indicator when isUpdating is true', () => {
    render(<SessionHeader isUpdating={true} />);
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('should not show updating indicator when isUpdating is false', () => {
    render(<SessionHeader isUpdating={false} />);
    expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
  });
});
