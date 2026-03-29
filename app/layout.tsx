import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Metadata } from 'next'

// Zdefiniowanie potężnych metadanych dla SEO oraz nowej ikony (favicon)
export const metadata: Metadata = {
  title: 'EnergyOptimizer - Kalkulator Taryf Dynamicznych i Optymalizacja Prądu',
  description: 'Darmowy audyt zużycia energii. Wgraj plik CSV od operatora (Tauron, PGE, Enea) i sprawdź, czy taryfa dynamiczna Ci się opłaca. Optymalizuj rachunki i pompę ciepła.',
  keywords: 'taryfy dynamiczne, ceny prądu, RCE, kalkulator g11, tauron csv, pge csv, home assistant, optymalizacja kosztów prądu, pompa ciepła',
  authors: [{ name: 'EnergyOptimizer' }],
  icons: {
    // Szmaragdowa błyskawica jako ikona w karcie przeglądarki
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310b981" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>',
  },
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