
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptResponseSchema, PromptFramework } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: "A quality score from 0 to 100.",
    },
    critique: {
      type: Type.STRING,
      description: "Analysis of what is missing or weak (in Portuguese).",
    },
    changes: {
      type: Type.STRING,
      description: "Summary of changes made (in Portuguese).",
    },
    improvedPrompt: {
      type: Type.STRING,
      description: "The rewritten prompt (in Portuguese).",
    },
    usedTechnique: {
      type: Type.STRING,
      description: "The name of the specific prompt engineering framework or system applied.",
    },
    techniqueExplanation: {
      type: Type.STRING,
      description: "A brief educational definition of the technique used (in Portuguese). Explain WHAT it is.",
    },
    techniqueApplication: {
      type: Type.STRING,
      description: "A specific explanation of HOW this technique was applied to this specific prompt. Cite examples of added sections or structural changes.",
    },
  },
  required: ["score", "critique", "changes", "improvedPrompt", "usedTechnique", "techniqueExplanation", "techniqueApplication"],
};

export const improvePrompt = async (
  currentText: string,
  isCreationMode: boolean,
  iteration: number,
  selectedFramework: PromptFramework = 'auto'
): Promise<PromptResponseSchema> => {
  const model = "gemini-2.5-flash";

  // Framework instructions
  const frameworkInstructions = {
    'auto': "Analyze the input and SELECT THE BEST ENGINEERING FRAMEWORK automatically.",
    'costar': "FORCE the use of the **CO-STAR Framework** (Context, Objective, Style, Tone, Audience, Response). Structure the prompt explicitly with these labels.",
    'cot': "FORCE the use of **Chain-of-Thought (CoT)**. Instructions must require the model to think step-by-step or explain reasoning.",
    'few-shot': "FORCE the use of **Few-Shot Prompting**. You MUST invent realistic Input -> Output examples to guide the model.",
    'persona': "FORCE the use of **Persona/Role Prompting**. Define a highly specific expert persona.",
    'decomposition': "FORCE the use of **Task Decomposition**. Break the prompt into a numbered list of sub-tasks."
  };

  const chosenInstruction = frameworkInstructions[selectedFramework];

  let systemInstruction = `
    You are an Expert Meta-Prompt Engineer.
    Your goal is to improve the user's prompt using advanced prompt engineering techniques.

    CRITICAL INSTRUCTION: ALL OUTPUT MUST BE IN PORTUGUESE (BRAZIL).
    The 'improvedPrompt', 'critique', 'changes', 'techniqueExplanation', and 'techniqueApplication' fields MUST be written in fluent, professional Portuguese.

    STRATEGY:
    ${chosenInstruction}

    GENERAL RULES:
    1. If the prompt is simple, make it professional.
    2. If the prompt is vague, add context and constraints.
    3. Always aim for clarity, specificity, and robustness.
    4. Fill 'usedTechnique' with the name of the technique.
    5. Fill 'techniqueExplanation' with a definition suitable for a student.
    6. Fill 'techniqueApplication' by pointing out exactly what parts of the new prompt correspond to the technique (e.g. "Added a 'Context' section to satisfy CO-STAR").
  `;

  let prompt = "";

  if (isCreationMode && iteration === 1) {
    prompt = `
      Task: CREATE a professional prompt based on this TOPIC/IDEA:
      "${currentText}"
      
      ENSURE THE GENERATED PROMPT IS IN PORTUGUESE (PT-BR).
    `;
  } else {
    prompt = `
      Task: IMPROVE the following prompt iteratively.
      
      Current Prompt:
      "${currentText}"
      
      Analyze weaknesses. Apply the selected framework strategies.
      ENSURE THE GENERATED PROMPT IS IN PORTUGUESE (PT-BR).
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: systemInstruction,
        temperature: 0.7, 
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as PromptResponseSchema;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const testPrompt = async (
  systemPromptToTest: string,
  userMessage: string
): Promise<string> => {
  const model = "gemini-2.5-flash";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userMessage,
      config: {
        systemInstruction: systemPromptToTest,
        temperature: 0.7,
      },
    });

    return response.text || "Sem resposta.";
  } catch (error) {
    console.error("Test Drive Error:", error);
    return "Erro ao testar o prompt. Verifique se a entrada é válida.";
  }
};
