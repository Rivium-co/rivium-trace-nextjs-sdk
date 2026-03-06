import type { Metadata } from 'next';
import { Providers } from './providers';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'RiviumTrace Next.js SDK Example',
  description: 'Example app demonstrating RiviumTrace SDK features',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '2px solid #dee2e6',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#228be6', marginRight: '20px' }}>
              RiviumTrace SDK Tests
            </h2>
            <Link
              href="/"
              style={{
                padding: '8px 16px',
                backgroundColor: '#228be6',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              1. Manual Error
            </Link>
            <Link
              href="/message"
              style={{
                padding: '8px 16px',
                backgroundColor: '#40c057',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              2. Messages
            </Link>
            <Link
              href="/error-boundary"
              style={{
                padding: '8px 16px',
                backgroundColor: '#fa5252',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              3. Error Boundary
            </Link>
            <Link
              href="/breadcrumbs"
              style={{
                padding: '8px 16px',
                backgroundColor: '#7950f2',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              4. Breadcrumbs
            </Link>
            <Link
              href="/crash-detection"
              style={{
                padding: '8px 16px',
                backgroundColor: '#fd7e14',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              5. Crash Detection
            </Link>
            <Link
              href="/performance"
              style={{
                padding: '8px 16px',
                backgroundColor: '#f59f00',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              6. Performance
            </Link>
            <Link
              href="/logging"
              style={{
                padding: '8px 16px',
                backgroundColor: '#20c997',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              7. Logging
            </Link>
            <Link
              href="/user-context"
              style={{
                padding: '8px 16px',
                backgroundColor: '#845ef7',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              8. User Context
            </Link>
            <Link
              href="/source-maps"
              style={{
                padding: '8px 16px',
                backgroundColor: '#339af0',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              9. Source Maps
            </Link>
          </div>
        </nav>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
