import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { createFaviconResponse } from './lib/favicon';

const isPublicRoute = createRouteMatcher([
  '/',
  '/faq',
  '/polityka',
  '/regulamin',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook/stripe(.*)',
  '/api/v1/(.*)'
]);

export default clerkMiddleware((auth, request) => {
  if (request.nextUrl.pathname === '/favicon.ico') {
    return createFaviconResponse();
  }

  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/favicon.ico',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)'
  ]
};
