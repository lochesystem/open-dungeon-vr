import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Open Dungeon VR — D3.3 Escudo direcional',
  description: 'Laboratório de combate VR com espada livre, escudo direcional e produção FULL IA.',
  openGraph: {
    title: 'Open Dungeon VR',
    description: 'Teste espada livre e bloqueios direcionais no laboratório de combate de Open Dungeon VR.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Portal rúnico de Open Dungeon VR' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Dungeon VR',
    description: 'Espada livre e escudo direcional em uma experiência WebXR criada com produção FULL IA.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
