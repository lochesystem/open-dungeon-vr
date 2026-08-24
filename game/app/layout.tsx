import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Open Dungeon VR — D4.3 Queda do Guardião',
  description: 'Guardião Ossário com vida, stagger, morte e recompensa física em um dungeon crawler WebXR FULL IA.',
  openGraph: {
    title: 'Open Dungeon VR',
    description: 'Derrote o Guardião Ossário e recolha sua Runa da Memória em Open Dungeon VR.',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Portal rúnico de Open Dungeon VR' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Dungeon VR',
    description: 'Primeiro inimigo derrotável em uma experiência WebXR criada com produção FULL IA.',
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
