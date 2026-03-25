export type BlobAvatarColorPreset = "sunset" | "ocean" | "forest" | "berry";

export type BlobAvatarShapePreset = "peach" | "wave" | "petal";

export type BlobAvatarEyesPreset = "classic" | "happy" | "wink";

export interface BlobAvatarConfig {
  colorPreset: BlobAvatarColorPreset;
  shapePreset: BlobAvatarShapePreset;
  eyesPreset: BlobAvatarEyesPreset;
}

export const BLOB_AVATAR_COLORS: BlobAvatarColorPreset[] = [
  "sunset",
  "ocean",
  "forest",
  "berry",
];

export const BLOB_AVATAR_SHAPES: BlobAvatarShapePreset[] = [
  "peach",
  "wave",
  "petal",
];

export const BLOB_AVATAR_EYES: BlobAvatarEyesPreset[] = [
  "classic",
  "happy",
  "wink",
];

export const DEFAULT_BLOB_AVATAR: BlobAvatarConfig = {
  colorPreset: "sunset",
  shapePreset: "peach",
  eyesPreset: "classic",
};

const hashSeed = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickByHash = <T>(items: T[], hash: number, offset: number): T => {
  return items[(hash + offset) % items.length];
};

export const generateBlobAvatarPreset = (seed: string): BlobAvatarConfig => {
  if (!seed) return DEFAULT_BLOB_AVATAR;
  const hash = hashSeed(seed);

  return {
    colorPreset: pickByHash(BLOB_AVATAR_COLORS, hash, 0),
    shapePreset: pickByHash(BLOB_AVATAR_SHAPES, hash, 3),
    eyesPreset: pickByHash(BLOB_AVATAR_EYES, hash, 7),
  };
};

export const normalizeBlobAvatarConfig = (
  config: Partial<BlobAvatarConfig> | null | undefined,
  seed: string,
): BlobAvatarConfig => {
  const preset = generateBlobAvatarPreset(seed);

  return {
    colorPreset:
      config?.colorPreset && BLOB_AVATAR_COLORS.includes(config.colorPreset)
        ? config.colorPreset
        : preset.colorPreset,
    shapePreset:
      config?.shapePreset && BLOB_AVATAR_SHAPES.includes(config.shapePreset)
        ? config.shapePreset
        : preset.shapePreset,
    eyesPreset:
      config?.eyesPreset && BLOB_AVATAR_EYES.includes(config.eyesPreset)
        ? config.eyesPreset
        : preset.eyesPreset,
  };
};
