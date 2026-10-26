import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/Toast';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import './globals.css';

const sans = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'AetherSMP — Minecraft SMP с кастомными расами',
    template: '%s · AetherSMP',
  },
  description:
    'Ванильное выживание с пятью уникальными расами, экономикой и живым сообществом. Заходи и выбери свой путь.',
  keywords: ['Minecraft', 'SMP', 'сервер', 'расы', 'выживание'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'AetherSMP',
    title: 'AetherSMP — Minecraft SMP с кастомными расами',
    description: 'Ванильное выживание с пятью уникальными расами.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#05060a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <ToastProvider>
            <div className="pointer-events-none fixed inset-0 -z-10 bg-grid bg-grid opacity-[0.35]" />
            <SiteHeader />
            <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">{children}</main>
            <SiteFooter />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
