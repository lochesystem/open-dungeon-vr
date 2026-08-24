export type EnemyAttackPhase = 'ready' | 'windup' | 'swing' | 'recover';

export const ENEMY_ATTACK_RANGE = 1.72;
export const ENEMY_WINDUP_SECONDS = 0.58;
export const ENEMY_SWING_SECONDS = 0.3;
export const ENEMY_RECOVER_SECONDS = 0.76;

export function nextEnemyAttackPhase(
  phase: EnemyAttackPhase,
  phaseFinished: boolean,
  canAttack: boolean,
): EnemyAttackPhase {
  if (!canAttack) return 'ready';
  if (!phaseFinished) return phase;
  if (phase === 'ready') return 'windup';
  if (phase === 'windup') return 'swing';
  if (phase === 'swing') return 'recover';
  return 'ready';
}

export function enemyAttackArmAngle(phase: EnemyAttackPhase, progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  if (phase === 'windup') return 0.82 * (1 - (1 - t) ** 3);
  if (phase === 'swing') {
    const eased = t * t * (3 - 2 * t);
    return 0.82 + (-1.28 - 0.82) * eased;
  }
  if (phase === 'recover') return -1.28 * (1 - t);
  return 0;
}

export function canResolveEnemyAttack(alreadyResolved: boolean, contact: boolean): boolean {
  return !alreadyResolved && contact;
}
