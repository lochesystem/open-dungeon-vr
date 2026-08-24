export const XR_OPTIONAL_FEATURES = [
  'local-floor',
  'bounded-floor',
  'hand-tracking',
] as const;

export function createVrSessionInit(): XRSessionInit {
  return { optionalFeatures: [...XR_OPTIONAL_FEATURES] };
}
