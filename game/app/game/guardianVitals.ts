export const GUARDIAN_MAXIMUM_HEALTH = 4;

export type GuardianVitalState = {
  health: number;
  defeated: boolean;
  rewardDropped: boolean;
};

export function initialGuardianVitals(): GuardianVitalState {
  return {
    health: GUARDIAN_MAXIMUM_HEALTH,
    defeated: false,
    rewardDropped: false,
  };
}

export function damageGuardian(state: GuardianVitalState, damage = 1): GuardianVitalState {
  if (state.defeated || damage <= 0) return state;
  const health = Math.max(0, state.health - Math.max(1, Math.floor(damage)));
  const defeated = health === 0;
  return {
    health,
    defeated,
    rewardDropped: state.rewardDropped || defeated,
  };
}
