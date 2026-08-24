import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import { GameShell } from '../app/game/GameShell';

const root = document.getElementById('root');

if (!root) throw new Error('Elemento raiz não encontrado.');

createRoot(root).render(
  <StrictMode>
    <GameShell />
  </StrictMode>,
);
