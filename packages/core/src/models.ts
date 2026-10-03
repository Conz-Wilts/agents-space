import { createGateway, generateText, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { store, slug } from "./store";
import { isPrivateHost } from "./connectors";
import { decryptSecret, encryptSecret } from "./secrets";
import type { Agent, Model, ModelProvider, User } from "./schema";

/**
 * Models an owner adds to run their agents (scheduled runs today), like Visvine's models/:
 * a provider, the provider's model id, and an API key stored encrypted. Without a model an agent
 * runs on the platform default through the Vercel AI Gateway.
 */

export const DEFAULT_MODEL = process.env.SCHEDULE_MODEL ?? "anthropic/claude-sonnet-5.5";

export const PROVIDERS: Record<ModelProvider, { label: string; example: string; needsKey: boolean }> = {
  gateway: { label: "Vercel AI Gateway", example: "anthropic/claude-sonnet-5.5", needsKey: false },
  openai: { label: "OpenAI", example: "gpt-5", needsKey: true },
  anthropic: { label: "Anthropic (Claude)", example: "claude-sonnet-5-5", needsKey: true },
  google: { label: "Google Gemini", example: "gemini-2.5-pro", needsKey: true },
  openrouter: { label: "OpenRouter", example: "deepseek/deepseek-chat", needsKey: true },
  custom: { label: "OpenAI-compatible", example: "llama-3.3-70b", needsKey: true },
};

export async function addModel(
  owner: User,
  spec: { name: string; title?: string; provider: ModelProvider; model: string; baseUrl?: string; apiKey?: string },
): Promise<Model> {
  if (spec.provider === "custom") {
    if (!spec.baseUrl) throw new Error("A custom model needs base_url (an OpenAI-compatible API, e.g. https://api.together.xyz/v1).");
    const u = new URL(spec.baseUrl);
    if (u.protocol !== "https:" || isPrivateHost(u.hostname)) throw new Error("base_url must be a public https URL.");
  }
  const name = `${owner.handle}-${slug(spec.name) || "model"}`;
  const m = await store.saveModel({
    name,
    ownerId: owner.id,
    title: spec.title || spec.name,
    provider: spec.provider,
    model: spec.model.trim(),
    baseUrl: spec.provider === "custom" ? spec.baseUrl : undefined,
  });
  if (spec.apiKey) await store.setModelKey(name, encryptSecret(spec.apiKey));
  return { ...m, hasKey: m.hasKey || !!spec.apiKey };
}

async function ownedModel(owner: User, name: string) {
  const m = await store.getModel(name);
  if (!m || m.ownerId !== owner.id) throw new Error(`You don't have a model "${name}". See my_models.`);
  return m;
}

export async function setModelKey(owner: User, name: string, apiKey: string) {
  await ownedModel(owner, name);
  await store.setModelKey(name, encryptSecret(apiKey));
}

export async function removeModel(owner: User, name: string) {
  await ownedModel(owner, name);
  return store.deleteModel(name);
}

/** Point an agent at one of its owner's models, or back to the default (`undefined`). */
export async function setAgentModel(owner: User, agent: Agent, name?: string) {
  if (name) await ownedModel(owner, name);
  return store.updateAgent(agent.id, { model: name });
}

/** Why a model can't run yet, or undefined. */
export function modelProblem(m: Model) {
  return PROVIDERS[m.provider].needsKey && !m.hasKey ? `Needs an API key: set_model_key "${m.name}".` : undefined;
}

/** The AI SDK model for one of an owner's models, with its decrypted key. */
export async function languageModel(m: Model): Promise<LanguageModel> {
  const ct = await store.getModelKey(m.name);
  const apiKey = ct ? decryptSecret(ct) : undefined;
  if (PROVIDERS[m.provider].needsKey && !apiKey) throw new Error(`Model ${m.name} has no API key yet.`);
  switch (m.provider) {
    case "gateway":
      return apiKey ? createGateway({ apiKey })(m.model) : m.model;
    case "openai":
      return createOpenAI({ apiKey })(m.model);
    case "anthropic":
      return createAnthropic({ apiKey })(m.model);
    case "google":
      return createGoogle({ apiKey })(m.model);
    case "openrouter":
      return createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey })(m.model);
    case "custom":
      return createOpenAICompatible({ name: "custom", baseURL: m.baseUrl!, apiKey })(m.model);
  }
}

/** What runs an agent: its own model, else the platform default. */
export async function agentLanguageModel(agent: Agent): Promise<{ model: LanguageModel; label: string }> {
  const m = agent.model ? await store.getModel(agent.model) : undefined;
  if (!m) return { model: DEFAULT_MODEL, label: `${DEFAULT_MODEL} (default)` };
  return { model: await languageModel(m), label: `${m.title} (${m.provider}/${m.model})` };
}

/** One tiny call to check the provider, model id and key work. */
export async function testModel(owner: User, name: string) {
  const m = await ownedModel(owner, name);
  const started = Date.now();
  const r = await generateText({ model: await languageModel(m), prompt: "Reply with the single word: ready", maxOutputTokens: 16 });
  return { text: r.text.trim(), ms: Date.now() - started };
}
