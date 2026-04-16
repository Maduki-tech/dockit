import '~/styles/globals.css';

import { type Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';

import { TRPCReactProvider } from '~/trpc/react';
import { Toaster } from '~/components/ui/sonner';

export const metadata: Metadata = {
    title: 'Dockit',
    description: 'Shared task list for families and couples',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <ClerkProvider>
            <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
                <body>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <TRPCReactProvider>{children}</TRPCReactProvider>
                        <Toaster richColors />
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
