'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OpenDungeonEngine, type InteractionSnapshot } from './engine';

type Screen = 'home' | 'playing' | 'paused';

export function GameShell() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OpenDungeonEngine | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [xrSupported, setXrSupported] = useState(false);
  const [xrActive, setXrActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [notice, setNotice] = useState('Fundação D0 pronta para exploração.');
  const [interaction, setInteraction] = useState<InteractionSnapshot>({
    canGrab: false,
    heldBy: null,
    storedSlot: null,
    targetHits: 0,
    status: 'Encontre o cubo rúnico sobre o pedestal.',
  });

  useEffect(() => {
    if (!viewportRef.current) return;
    const engine = new OpenDungeonEngine(viewportRef.current, {
      onStats: setFps,
      onXrChange: setXrActive,
      onInteraction: setInteraction,
    });
    engineRef.current = engine;

    navigator.xr?.isSessionSupported('immersive-vr').then(setXrSupported).catch(() => setXrSupported(false));
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || screen === 'home') return;
      setScreen((current) => current === 'paused' ? 'playing' : 'paused');
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [screen]);

  useEffect(() => {
    engineRef.current?.setPaused(screen !== 'playing');
  }, [screen]);

  const playDesktop = useCallback(() => {
    engineRef.current?.reset();
    setNotice('Encontre o cubo rúnico, pegue-o e acerte o alvo ao fundo da sala.');
    setScreen('playing');
  }, []);

  const enterVr = useCallback(async () => {
    try {
      await engineRef.current?.enterVr();
      setNotice('Sessão imersiva ativa.');
      setScreen('playing');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível entrar em VR.');
    }
  }, []);

  const restart = useCallback(() => {
    engineRef.current?.reset();
    setNotice('Sala reiniciada sem recriar a engine.');
    setScreen('playing');
  }, []);

  const returnHome = useCallback(async () => {
    await engineRef.current?.exitVr();
    engineRef.current?.reset();
    setScreen('home');
    setNotice('Fundação D0 pronta para exploração.');
  }, []);

  return (
    <main className="game-shell">
      <div ref={viewportRef} className="viewport" />
      <div className="atmosphere" aria-hidden="true" />

      <header className="brand-bar">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <div>
          <p>OPEN DUNGEON</p>
          <span>VR · Fundação D0</span>
        </div>
        <div className="runtime-status" aria-label={`Renderização a ${fps} quadros por segundo`}>
          <i className={fps >= 55 ? 'healthy' : ''} />
          {fps || '—'} FPS
        </div>
      </header>

      {screen === 'home' && (
        <section className="home-panel" aria-labelledby="game-title">
          <p className="eyebrow">A CIDADE FOI ENGOLIDA. O PORTAL AINDA RESPIRA.</p>
          <h1 id="game-title">Abra a primeira<br /><em>passagem.</em></h1>
          <p className="intro">A fundação executável de uma masmorra viva feita inteiramente com produção assistida por IA.</p>
          <div className="primary-actions">
            <button className="primary-button" onClick={playDesktop}>Explorar na tela</button>
            <button className="secondary-button" onClick={enterVr} disabled={!xrSupported}>
              {xrSupported ? 'Entrar em VR' : 'VR não detectado'}
            </button>
          </div>
          <div className="foundation-list" aria-label="Recursos desta entrega">
            <span>01 · Mãos XR</span>
            <span>02 · Cubo físico</span>
            <span>03 · Bolsa de cintura</span>
          </div>
          <p className="notice" role="status">{notice}</p>
        </section>
      )}

      {screen === 'playing' && !xrActive && (
        <>
          <div className="crosshair" aria-hidden="true"><span /></div>
          <aside className="controls-card">
            <p>CONTROLES</p>
            <span><kbd>W</kbd><kbd>S</kbd> mover</span>
            <span><kbd>A</kbd><kbd>D</kbd> deslocar</span>
            <span><kbd>←</kbd><kbd>→</kbd> olhar</span>
            <span><kbd>E</kbd> pegar / soltar</span>
            <span><kbd>F</kbd> arremessar</span>
            <span><kbd>B</kbd> guardar / retirar</span>
            <span><kbd>R</kbd> recuperar cubo</span>
            <span><kbd>H</kbd> hitboxes</span>
            <span><kbd>ESC</kbd> pausar</span>
          </aside>
          <aside className="objective-card" aria-label="Objetivo da sala">
            <span>OBJETIVO D2.1</span>
            <strong>{interaction.storedSlot !== null ? 'CUBO GUARDADO' : interaction.targetHits > 0 ? 'ALVO ATINGIDO' : 'USE A BOLSA'}</strong>
            <small>{interaction.storedSlot !== null ? `Slot ${interaction.storedSlot + 1} ocupado` : interaction.heldBy ? 'Leve o cubo à cintura' : interaction.canGrab ? 'Cubo ao alcance' : 'Procure o pedestal'}</small>
          </aside>
          <p className="play-notice" role="status">{interaction.status || notice}</p>
        </>
      )}

      {screen === 'paused' && (
        <section className="pause-panel" aria-labelledby="pause-title">
          <p className="eyebrow">EXPEDIÇÃO INTERROMPIDA</p>
          <h2 id="pause-title">Pausa</h2>
          <p>A simulação está congelada; a sala permanece renderizada.</p>
          <div className="pause-actions">
            <button className="primary-button" onClick={() => setScreen('playing')}>Continuar</button>
            <button className="secondary-button" onClick={restart}>Reiniciar sala</button>
            <button className="text-button" onClick={returnHome}>Voltar ao portal</button>
          </div>
        </section>
      )}

      <footer className="build-label">BUILD D2.1 · LOCAL · {xrActive ? 'XR ATIVO' : 'DESKTOP'}</footer>
    </main>
  );
}
