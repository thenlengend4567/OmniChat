import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../lib/auth-context'

export const metadata: Metadata = {
  title: 'OmniChat | State-Of-The-Art Workspace',
  description: 'Production-grade real-time messaging application swarm dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#f4f4f5] antialiased overflow-hidden">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
