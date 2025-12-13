
export type Mode = 'create' | 'improve';
export type Strategy = 'iterations' | 'score';
export type PromptFramework = 
  | 'auto' 
  | 'costar' 
  | 'cot' 
  | 'few-shot' 
  | 'persona' 
  | 'decomposition' 
  | 'race' 
  | 'ape' 
  | 'rise' 
  | 'tag' 
  | 'bab';

export interface PromptVersion {
  step: number;
  content: string;
  score: number;
  critique: string;
  changes: string;
  usedTechnique?: string;
  techniqueExplanation?: string;
  techniqueApplication?: string;
}

export interface OptimizationConfig {
  mode: Mode;
  strategy: Strategy;
  targetIterations: number;
  targetScore: number;
  selectedTechnique: PromptFramework;
}

export interface PromptResponseSchema {
  score: number;
  critique: string;
  changes: string;
  improvedPrompt: string;
  usedTechnique: string;
  techniqueExplanation: string;
  techniqueApplication: string;
}
