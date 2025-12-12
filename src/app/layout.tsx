import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TS3 Vetinari',
  description: 'A TeamSpeak3 Serveradmin Utility',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-base-100">{children}</body>
    </html>
  )
}
