/// <reference types="@testing-library/jest-dom" />

import type { Assertion, AsymmetricMatchersContaining } from 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> extends AsymmetricMatchersContaining {
    toBeInTheDocument(): void;
    toHaveClass(className: string): void;
    toHaveAttribute(attr: string, value?: string): void;
    toHaveTextContent(text: string | RegExp): void;
    toBeVisible(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
  }
}
