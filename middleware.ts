import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Dodajemy /polityka i /regulamin oraz ścieżki API do ścieżek publicznych
const isPublicRoute = createRouteMatcher([
  '/', 
  '/polityka',
  '/regulamin',
  '/api/webhook/stripe(.*)',
  '/api/v1/(.*)' // <-- DODANE: Przepuszczamy zapytania API (np. dla Home Assistanta)
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};