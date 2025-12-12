import { render, screen } from '@testing-library/react';

import { CSRF_COOKIE_NAME } from './csrf';
import { CsrfProvider, useCsrf, useCsrfHeader } from './csrf-context';

afterEach(() => {
  document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; path=/`;
});

describe('CsrfProvider', () => {
  it('throws when hook used outside of provider', () => {
    const TestComponent = () => {
      useCsrf();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrowError(
      /useCsrf must be used within a CsrfProvider/,
    );
  });

  it('exposes the initial token', async () => {
    const initialToken = 'initial-token';
    document.cookie = `${CSRF_COOKIE_NAME}=${initialToken}`;

    const TestComponent = () => {
      const { token } = useCsrf();
      return <span>{token}</span>;
    };

    render(
      <CsrfProvider initialToken={initialToken}>
        <TestComponent />
      </CsrfProvider>,
    );

    expect(await screen.findByText(initialToken)).toBeInTheDocument();
  });

  it('refreshes token from document cookie', async () => {
    const cookieToken = 'cookie-token';
    document.cookie = `${CSRF_COOKIE_NAME}=${cookieToken}`;

    const TestComponent = () => {
      const headers = useCsrfHeader();
      return <span>{headers['x-csrf-token'] ?? 'missing'}</span>;
    };

    render(
      <CsrfProvider>
        <TestComponent />
      </CsrfProvider>,
    );

    expect(await screen.findByText(cookieToken)).toBeInTheDocument();
  });
});
