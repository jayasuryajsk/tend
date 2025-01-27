export const MODEL_IDS = {
  GEMINI_FLASH: 'gemini-2.0-flash-exp',
} as const;

export const MODEL_LABELS = {
  [MODEL_IDS.GEMINI_FLASH]: 'Gemini Flash',
} as const;

export const MODEL_DESCRIPTIONS = {
  [MODEL_IDS.GEMINI_FLASH]: 'Experimental fast version of Gemini',
} as const;

export const MODEL_CAPABILITIES = {
  [MODEL_IDS.GEMINI_FLASH]: {
    multimodal: true,
    fileTypes: ['application/pdf'],
  },
} as const;

export const DEFAULT_MODEL_ID = MODEL_IDS.GEMINI_FLASH; 