import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Energy Optimizer AI",
  description: "Inteligentna analityka Twojego profilu zużycia na taryfach dynamicznych.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="pl">
        <body className={inter.className} style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a' }}>
          
          {/* Globalny pasek nawigacji (Header) */}
          <header style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            padding: '1rem 2rem', 
            borderBottom: '1px solid #222',
            backgroundColor: '#0f0f0f'
          }}>
            <SignedOut>
              {/* Przycisk widoczny tylko dla NIEZALOGOWANYCH */}
              <SignInButton mode="modal">
                <button style={{
                  padding: '8px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Zaloguj się
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              {/* Ikona profilu widoczna tylko dla ZALOGOWANYCH */}
              <UserButton />
            </SignedIn>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
