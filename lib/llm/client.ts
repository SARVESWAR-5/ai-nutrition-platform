import { GoogleGenAI } from "@google/genai";

export class LLMUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LLMUnavailableError";
  }
}

export interface LLMGenerateOptions<T = any> {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  responseSchema?: any; // JSON schema for structured output
  temperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Resilient LLMClient wrapping @google/genai SDK.
 * Server-side only. Supports structured JSON schema outputs, timeouts,
 * retries with backoff, and graceful fallback when unconfigured.
 */
export class LLMClient {
  private client: GoogleGenAI | null = null;
  private defaultFastModel: string;
  private defaultProModel: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "AIzaSy..." && !apiKey.startsWith("AIzaSyFake")) {
      this.client = new GoogleGenAI({ apiKey });
    }
    this.defaultFastModel = process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash";
    this.defaultProModel = process.env.GEMINI_MODEL_PRO || "gemini-2.5-pro";
  }

  public isAvailable(): boolean {
    return this.client !== null;
  }

  public getFastModel(): string {
    return this.defaultFastModel;
  }

  public getProModel(): string {
    return this.defaultProModel;
  }

  /**
   * Generates structured JSON output validated against a provided JSON schema.
   */
  public async generateStructured<T>(options: LLMGenerateOptions<T>): Promise<T> {
    if (!this.client) {
      throw new LLMUnavailableError(
        "GEMINI_API_KEY is not configured or invalid. LLM features run in fallback mode."
      );
    }

    const modelName = options.model || this.defaultFastModel;
    const maxRetries = options.maxRetries ?? 2;
    const timeoutMs = options.timeoutMs ?? 15000;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`LLM request timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const generatePromise = this.client.models.generateContent({
          model: modelName,
          contents: options.prompt,
          config: {
            systemInstruction: options.systemInstruction,
            temperature: options.temperature ?? 0.1,
            responseMimeType: "application/json",
            responseSchema: options.responseSchema,
          },
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const text = response.text;
        if (!text) {
          throw new Error("Empty response returned from Gemini API");
        }

        const parsed: T = JSON.parse(text);
        return parsed;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms
          await new Promise((res) => setTimeout(res, 500 * Math.pow(2, attempt)));
        }
      }
    }

    throw new LLMUnavailableError(
      `Failed to generate structured LLM response after ${maxRetries + 1} attempts.`,
      lastError
    );
  }

  /**
   * Generates standard text response with timeout and retries.
   */
  public async generateText(options: LLMGenerateOptions<string>): Promise<string> {
    if (!this.client) {
      throw new LLMUnavailableError(
        "GEMINI_API_KEY is not configured. LLM features run in fallback mode."
      );
    }

    const modelName = options.model || this.defaultFastModel;
    try {
      const response: any = await this.client.models.generateContent({
        model: modelName,
        contents: options.prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.4,
        },
      });
      return response.text || "";
    } catch (err) {
      throw new LLMUnavailableError("Error during Gemini text generation", err);
    }
  }
}

export const llmClient = new LLMClient();
