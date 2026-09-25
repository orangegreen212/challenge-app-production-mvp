import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/auth-context';
import { ChallengeProvider } from '@/lib/challenge-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Challenge AI — Turn your goals into daily progress',
  description:
    'Upload any learning material and AI turns it into a structured daily challenge. Track progress, build streaks, and achieve your goals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <AuthProvider>
          <ChallengeProvider>
            {children}
          </ChallengeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
