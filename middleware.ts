import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Definiujemy ścieżki, które są całkowicie publiczne i nie wymagają logowania
const isPublicRoute = createRouteMatcher([
  '/', // Strona główna (Landing Page)
  '/api/webhook/stripe(.*)' // BARDZO WAŻNE: Wpuszczamy powiadomienia od Stripe
]);

export default clerkMiddleware((auth, request) => {
  // Jeśli to nie jest publiczna ścieżka, wymagaj zalogowania
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Pomiń pliki wewnętrzne Next.js i pliki statyczne
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Zawsze uruchamiaj middleware dla ścieżek API
    '/(api|trpc)(.*)',
  ],
};