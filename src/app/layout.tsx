import ThemeRegistry from '@/components/ThemeRegistry';
import { ClerkProvider } from '@clerk/nextjs';
import { SocketProvider } from '@/context/SocketContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ThemeRegistry>
            <SocketProvider>
              {children}
            </SocketProvider>
          </ThemeRegistry>
        </body>
      </html>
    </ClerkProvider>
  );
}