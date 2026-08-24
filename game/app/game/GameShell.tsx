'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_COMFORT_SETTINGS,
  OpenDungeonEngine,
  type ComfortSettings,
  type InteractionSnapshot,
} from './engine';

type Screen = 'home' | 'playing' | 'paused';

const ENEMY_STATE_LABEL = {
  idle: 'OCIOSO',
  patrol: 'PATRULHA',
  alert: 'ALERTA',
  chase: 'PERSEGUIÇÃO',
  return: 'RETORNO',
} as const;

const ENEMY_ATTACK_LABEL = {
  ready: 'PRONTO',
  windup: 'PREPARO',
  swing: 'GOLPE',
  recover: 'RECUPERAÇÃO',
} as const;

type ComfortControlsProps = {
  comfort: ComfortSettings;
  onChange: <Key extends keyof ComfortSettings>(key: Key, value: ComfortSettings[Key]) => void;
};

function ComfortControls({ comfort, onChange }: ComfortControlsProps) {
  return (
    <div className="comfort-panel" aria-label="Configurações de conforto">
      <div className="comfort-row">
        <span>Postura</span>
        <div className="comfort-options">
          <button className={comfort.posture === 'standing' ? 'active' : ''} onClick={() => onChange('posture', 'standing')}>Em pé</button>
          <button className={comfort.posture === 'seated' ? 'active' : ''} onClick={() => onChange('posture', 'seated')}>Sentado</button>
        </div>
      </div>
      <div className="comfort-row">
        <span>Mão dominante</span>
        <div className="comfort-options">
          <button className={comfort.dominantHand === 'left' ? 'active' : ''} onClick={() => onChange('dominantHand', 'left')}>Esquerda · X</button>
          <button className={comfort.dominantHand === 'right' ? 'active' : ''} onClick={() => onChange('dominantHand', 'right')}>Direita · A</button>
        </div>
      </div>
      <div className="comfort-row">
        <span>Controles</span>
        <div className="comfort-options">
          <button className={!comfort.oneHandMode ? 'active' : ''} onClick={() => onChange('oneHandMode', false)}>Duas mãos</button>
          <button className={comfort.oneHandMode ? 'active' : ''} onClick={() => onChange('oneHandMode', true)}>Uma mão</button>
        </div>
      </div>
      <label className="comfort-slider">
        <span>Altura da cintura <output>{Math.round(comfort.waistOffset * 100)} cm</output></span>
        <input type="range" min="-0.2" max="0.2" step="0.02" value={comfort.waistOffset} onChange={(event) => onChange('waistOffset', Number(event.target.value))} />
      </label>
      <label className="comfort-slider">
        <span>Distância do menu <output>{Math.round(comfort.menuDistance * 100)} cm</output></span>
        <input type="range" min="0.42" max="0.72" step="0.02" value={comfort.menuDistance} onChange={(event) => onChange('menuDistance', Number(event.target.value))} />
      </label>
      <small>A bolsa abre com {comfort.dominantHand === 'left' ? 'X na mão esquerda' : 'A na mão direita'}.</small>
    </div>
  );
}

export function GameShell() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OpenDungeonEngine | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [xrSupported, setXrSupported] = useState(false);
  const [xrActive, setXrActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [notice, setNotice] = useState('Fundação D0 pronta para exploração.');
  const [comfort, setComfort] = useState<ComfortSettings>({ ...DEFAULT_COMFORT_SETTINGS });
  const [interaction, setInteraction] = useState<InteractionSnapshot>({
    canGrab: false,
    heldBy: null,
    storedSlot: null,
    targetHits: 0,
    storedItemCount: 0,
    keyInserted: false,
    doorOpen: false,
    health: 3,
    maximumHealth: 3,
    potionConsumed: false,
    dummyHits: 0,
    blockedAttacks: 0,
    receivedAttacks: 0,
    enemyState: 'idle',
    enemyDistance: 0,
    enemyAttackPhase: 'ready',
    enemyBlockedAttacks: 0,
    enemyHits: 0,
    guardianHealth: 4,
    guardianMaximumHealth: 4,
    guardianDefeated: false,
    guardianRewardStored: false,
    status: 'Encontre a espada e derrote o boneco de treinamento.',
  });

  useEffect(() => {
    if (!viewportRef.current) return;
    const engine = new OpenDungeonEngine(viewportRef.current, {
      onStats: setFps,
      onXrChange: setXrActive,
      onInteraction: setInteraction,
      onComfortChange: setComfort,
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

  useEffect(() => {
    engineRef.current?.setComfortSettings(comfort);
  }, [comfort]);

  const updateComfort = <Key extends keyof ComfortSettings,>(key: Key, value: ComfortSettings[Key]) => {
    setComfort((current) => ({ ...current, [key]: value }));
  };

  const playDesktop = useCallback(() => {
    engineRef.current?.reset();
    setNotice('Enfrente o Guardião Ossário, interrompa seus golpes e recolha a runa libertada.');
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
          <details className="home-comfort">
            <summary>Conforto e acessibilidade</summary>
            <ComfortControls comfort={comfort} onChange={updateComfort} />
          </details>
          <div className="foundation-list" aria-label="Recursos desta entrega">
            <span>01 · Mãos XR</span>
            <span>02 · Cubo físico</span>
            <span>03 · Bolsa de cintura</span>
            <span>04 · Chave e passagem</span>
            <span>05 · Poção e vida</span>
            <span>06 · Espada e treino</span>
            <span>07 · Escudo direcional</span>
            <span>08 · IA do Guardião</span>
            <span>09 · Golpe e bloqueio</span>
            <span>10 · Vida, morte e runa</span>
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
            <span><kbd>G</kbd> beber poção</span>
            <span><kbd>J</kbd> golpe de espada</span>
            <span><kbd>B</kbd> guardar / retirar</span>
            <span><kbd>R</kbd> reiniciar itens</span>
            <span><kbd>H</kbd> hitboxes</span>
            <span><kbd>ESC</kbd> pausar</span>
          </aside>
          <aside className="objective-card" aria-label="Objetivo da sala">
            <span>OBJETIVO D4.3 · GUARDIÃO A {interaction.enemyDistance.toFixed(1)} M</span>
            <strong>{interaction.guardianDefeated
              ? 'DERROTADO'
              : `${ENEMY_STATE_LABEL[interaction.enemyState]} · ${ENEMY_ATTACK_LABEL[interaction.enemyAttackPhase]}`}</strong>
            <small>{interaction.guardianDefeated
              ? interaction.guardianRewardStored ? 'Runa guardada · encontro concluído' : 'Recolha a Runa da Memória'
              : `Vida ${interaction.guardianHealth}/${interaction.guardianMaximumHealth} · defesas ${interaction.enemyBlockedAttacks}`}</small>
          </aside>
          <p className="play-notice" role="status">{interaction.status || notice}</p>
        </>
      )}

      {screen === 'paused' && (
        <section className="pause-panel" aria-labelledby="pause-title">
          <p className="eyebrow">EXPEDIÇÃO INTERROMPIDA</p>
          <h2 id="pause-title">Pausa</h2>
          <p>A simulação está congelada; a sala permanece renderizada.</p>
          <ComfortControls comfort={comfort} onChange={updateComfort} />
          <div className="pause-actions">
            <button className="primary-button" onClick={() => setScreen('playing')}>Continuar</button>
            <button className="secondary-button" onClick={restart}>Reiniciar sala</button>
            <button className="text-button" onClick={returnHome}>Voltar ao portal</button>
          </div>
        </section>
      )}

      <footer className="build-label">BUILD D4.3 · LOCAL · {xrActive ? 'XR ATIVO' : 'DESKTOP'}</footer>
    </main>
  );
}
