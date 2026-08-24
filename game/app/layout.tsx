import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Open Dungeon VR — D4.2 Combate do Guardião',
  description: 'Guardião Ossário com golpe físico de maça e bloqueio direcional em um dungeon crawler WebXR FULL IA.',
  openGraph: {
    title: 'Open Dungeon VR',
    description: 'Enfrente o primeiro golpe corpo a corpo do Guardião Ossário de Open Dungeon VR.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Portal rúnico de Open Dungeon VR' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Dungeon VR',
    description: 'Primeiro combate inimigo funcional em uma experiência WebXR criada com produção FULL IA.',
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
