// app/layout.tsx
import { ReactNode } from 'react'

export const metadata = {
  title: 'Finance Manager',
  description: 'Smart Tools for Smarter Financial Decisions',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  
  // renders those tags. Returning a fragment prevents duplicate html/body
  // elements which cause hydration errors in Next.js.
  return <>{children}</>;
}
