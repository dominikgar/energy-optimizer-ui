import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Metadata } from 'next';
import AdminGlobalLink from './components/AdminGlobalLink';

export const metadata: Metadata = {
  title: 'EnergyOptimizer - analiza zużycia i cen energii',
  description: 'Wgraj historię zużycia energii, porównaj ją z publicznymi cenami RCE i sprawdź, kiedy zużywasz energię najdrożej. Wyniki mają charakter orientacyjny.',
  keywords: 'taryfy dynamiczne, ceny prądu, RCE, analiza zużycia, Tauron CSV, PGE CSV, Home Assistant, pompa ciepła',
  authors: [{ name: 'EnergyOptimizer' }],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310b981" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.71 13.5 3l-1.33 8.29H20l-9.5 11.71 1.33-8.29H4z"/></svg>'
  },
  openGraph: {
    title: 'EnergyOptimizer - analiza profilu zużycia energii',
    description: 'Darmowa analiza historii zużycia i publicznych cen RCE. Sprawdź potencjał przesuwania pracy urządzeń na tańsze godziny.',
    url: 'https://energyoptimizer.pl',
    siteName: 'EnergyOptimizer',
    locale: 'pl_PL',
    type: 'website'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
    >
      <html lang="pl">
        <body>
          {children}
          <AdminGlobalLink />
        </body>
      </html>
    </ClerkProvider>
  );
}
