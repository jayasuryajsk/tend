import { MODEL_DESCRIPTIONS, MODEL_IDS, MODEL_LABELS, MODEL_CAPABILITIES, DEFAULT_MODEL_ID } from './constants';

// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
  capabilities?: {
    multimodal: boolean;
    fileTypes: readonly string[];
  };
}

export const models: Array<Model> = [
  {
    id: MODEL_IDS.GEMINI_FLASH,
    label: MODEL_LABELS[MODEL_IDS.GEMINI_FLASH],
    apiIdentifier: MODEL_IDS.GEMINI_FLASH,
    description: MODEL_DESCRIPTIONS[MODEL_IDS.GEMINI_FLASH],
    capabilities: MODEL_CAPABILITIES[MODEL_IDS.GEMINI_FLASH],
  },
] as const;

export const DEFAULT_MODEL_NAME = DEFAULT_MODEL_ID;
