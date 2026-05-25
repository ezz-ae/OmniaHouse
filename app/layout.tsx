import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

// Mobile-first viewport — required for any phone to render the UI at the
// right size. Without this, mobile shows a desktop-zoom-out view.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0a',
};

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'House of Omnia',
  description: 'Private management system for the Omnia team.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sans.variable, mono.variable, serif.variable)}>
      <body className="min-h-screen bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
