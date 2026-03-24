import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Energy Optimizer AI',
  description: 'Zoptymalizuj swoje koszty na taryfach dynamicznych.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="pl">
        <body className={inter.className}>
          {/* USUNĄŁEM STARY HEADER STĄD. Teraz stroną steruje tylko page.tsx! */}
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
