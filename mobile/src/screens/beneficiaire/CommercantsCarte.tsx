// tsc ne comprend pas nativement la convention Metro .native.tsx/.web.tsx —
// ce fichier existe uniquement pour la résolution TypeScript. Metro, lui,
// choisit toujours .native.tsx (iOS/Android) ou .web.tsx (web) en priorité
// sur ce fichier, qui n'est donc jamais réellement empaqueté.
export { default } from './CommercantsCarte.native';
