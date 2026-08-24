export const XR_OPTIONAL_FEATURES = [
  'local-floor',
  'bounded-floor',
  'layers',
] as const;

export function createVrSessionInit(): XRSessionInit {
  return { optionalFeatures: [...XR_OPTIONAL_FEATURES] };
}
