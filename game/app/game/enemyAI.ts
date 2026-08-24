export type EnemyState = 'idle' | 'patrol' | 'alert' | 'chase' | 'return';

export type Point2 = { x: number; z: number };

export const ENEMY_DETECTION_RANGE = 5.4;
export const ENEMY_LOSE_RANGE = 8.2;
export const ENEMY_ALERT_SECONDS = 0.7;

export function nextEnemyState(
  state: EnemyState,
  distanceToPlayer: number,
  stateSeconds: number,
  reachedHome: boolean,
): EnemyState {
  const seesPlayer = distanceToPlayer <= ENEMY_DETECTION_RANGE;
  if (state === 'idle') {
    if (seesPlayer) return 'alert';
    return stateSeconds >= 1.2 ? 'patrol' : 'idle';
  }
  if (state === 'patrol') return seesPlayer ? 'alert' : 'patrol';
  if (state === 'alert') {
    if (distanceToPlayer > ENEMY_LOSE_RANGE) return 'return';
    return stateSeconds >= ENEMY_ALERT_SECONDS ? 'chase' : 'alert';
  }
  if (state === 'chase') return distanceToPlayer > ENEMY_LOSE_RANGE ? 'return' : 'chase';
  if (seesPlayer) return 'alert';
  return reachedHome ? 'idle' : 'return';
}

export function enemyStepToward(current: Point2, target: Point2, maximumDistance: number): Point2 {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 1e-6 || maximumDistance <= 0) return { x: 0, z: 0 };
  const scale = Math.min(maximumDistance, distance) / distance;
  return { x: dx * scale, z: dz * scale };
}

export function enemyStateLabel(state: EnemyState): string {
  return {
    idle: 'OCIOSO',
    patrol: 'PATRULHA',
    alert: 'ALERTA',
    chase: 'PERSEGUIÇÃO',
    return: 'RETORNO',
  }[state];
}
