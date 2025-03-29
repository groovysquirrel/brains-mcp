import defaultLLMSettings from './defaults/defaultLLMSettings.json';
import defaultPrompts from './defaults/defaultPrompts.json'
import defaultLLMs from './defaults/defaultLLMs.json'
import defaultGenerators from './defaults/defaultGenerators.json'
import defaultTransformers from './defaults/defaultTransformers.json'
import defaultFlow from './defaults/defaultFlow.json'
import defaultModel from './defaults/defaultModel.json'

console.log('[DataIndex] Loading defaults...');
console.log('[DataIndex] Default flows:', defaultFlow.flows?.length || 0);
console.log('[DataIndex] Default models:', defaultModel.model?.length || 0);

export const defaults = {
  prompts: defaultPrompts.prompts,
  generators: defaultGenerators.generators,
  transformers: defaultTransformers.objects,
  llms: defaultLLMs.llms,
  flows: defaultFlow.flows,
  models: defaultModel.model
} as const;

export type DefaultDataType = keyof typeof defaults;