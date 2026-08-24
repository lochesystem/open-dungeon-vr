import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Open Dungeon VR — D1 Mãos e objeto',
  description: 'Primeira interação física jogável de um dungeon crawler cooperativo criado com produção FULL IA.',
  openGraph: {
    title: 'Open Dungeon VR',
    description: 'A masmorra lembra. Explore a fundação jogável criada com produção FULL IA.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Portal rúnico de Open Dungeon VR' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Dungeon VR',
    description: 'A masmorra lembra. Fundação jogável criada com produção FULL IA.',
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
