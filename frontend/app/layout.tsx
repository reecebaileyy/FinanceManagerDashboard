// app/layout.tsx
import { ReactNode } from 'react'

export const metadata = {
  title: 'Finance Manager',
  description: 'Smart Tools for Smarter Financial Decisions',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
