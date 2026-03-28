import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Metadata } from 'next'

// Zdefiniowanie potężnych metadanych dla SEO
export const metadata: Metadata = {
  title: 'EnergyOptimizer - Kalkulator Taryf Dynamicznych i Optymalizacja Prądu',
  description: 'Darmowy audyt zużycia energii. Wgraj plik CSV od operatora (Tauron, PGE, Enea) i sprawdź, czy taryfa dynamiczna Ci się opłaca. Optymalizuj rachunki i pompę ciepła.',
  keywords: 'taryfy dynamiczne, ceny prądu, RCE, kalkulator g11, tauron csv, pge csv, home assistant, optymalizacja kosztów prądu, pompa ciepła',
  authors: [{ name: 'EnergyOptimizer' }],
  openGraph: {
    title: 'EnergyOptimizer - Policz czy opłaca Ci się taryfa dynamiczna',
    description: 'Darmowy audyt historii zużycia z plików CSV (Tauron, PGE, Enea). Sprawdź swoje koszty na rynku giełdowym (RCE) i oszczędzaj.',
    url: 'https://energyoptimizer.pl',
    siteName: 'EnergyOptimizer',
    locale: 'pl_PL',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="pl">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}