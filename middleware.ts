import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Dodajemy /polityka i /regulamin do ścieżek publicznych
const isPublicRoute = createRouteMatcher([
  '/', 
  '/polityka',
  '/regulamin',
  '/api/webhook/stripe(.*)' 
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