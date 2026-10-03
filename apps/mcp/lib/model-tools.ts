import type { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { store, addModel, modelProblem, removeModel, setAgentModel, setModelKey, testModel, DEFAULT_MODEL, PROVIDERS, type Model } from "@agents-space/core";
import { requireUser } from "@/lib/auth";
import { safe, text } from "@/lib/format";

type Server = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

const describe = (m: Model) =>
  `• ${m.name} — ${m.title}: ${PROVIDERS[m.provider].label} ${m.model}${m.baseUrl ? ` @ ${m.baseUrl}` : ""}${m.hasKey ? " · key ✓" : ""}${modelProblem(m) ? `\n  ${modelProblem(m)}` : ""}`;

const providers = Object.entries(PROVIDERS)
  .map(([k, p]) => `${k} (${p.label}, e.g. "${p.example}"${p.needsKey ? "" : ", no key needed"})`)
  .join("; ");

/** Owner tools for the LLMs that run their agents (scheduled runs). */
export function registerModelTools(server: Server) {
  server.registerTool(
    "add_model",
    {
      title: "Add a model",
      description: `Add an LLM your agents can run on: OpenAI, Claude, Gemini, any OpenRouter model, an OpenAI-compatible API, or the Vercel AI Gateway. Providers: ${providers}. Pass api_key only if the user gave it to you; otherwise set it later with set_model_key (stored encrypted, never shown). Same name again replaces it. Then set_agent_model.`,
      inputSchema: z.object({
        name: z.string().describe("Short name, e.g. 'claude' or 'deepseek' (namespaced to your handle)"),
        title: z.string().optional(),
        provider: z.enum(["gateway", "openai", "anthropic", "google", "openrouter", "custom"]),
        model: z.string().describe("The provider's model id; vendor-prefixed on OpenRouter and the gateway"),
        base_url: z.string().url().optional().describe("custom only: the OpenAI-compatible base URL"),
        api_key: z.string().optional(),
      }),
    },
    safe(async ({ base_url, api_key, ...spec }, ctx) => {
      const user = await requireUser(ctx);
      const m = await addModel(user, { ...spec, baseUrl: base_url, apiKey: api_key });
      return text(`Model saved.\n${describe(m)}\n\nCheck it with test_model, then set_agent_model to use it.`);
    }),
  );

  server.registerTool(
    "my_models",
    { title: "My models", description: "Models you've added, and which agents use them.", inputSchema: z.object({}) },
    safe(async (_i, ctx) => {
      const user = await requireUser(ctx);
      const [models, agents] = await Promise.all([store.listModels(user.id), store.listAgents({ viewerId: user.id })]);
      const lines = models.map((m) => {
        const used = agents.filter((a) => a.ownerId === user.id && a.model === m.name).map((a) => a.id);
        return `${describe(m)}${used.length ? `\n  used by: ${used.join(", ")}` : ""}`;
      });
      return text(`${lines.join("\n") || "No models yet. Use add_model."}\n\nAgents without a model run on ${DEFAULT_MODEL}.`);
    }),
  );

  server.registerTool(
    "set_model_key",
    {
      title: "Set a model's API key",
      description: "Store the API key for one of your models. Encrypted at rest; never shown again.",
      inputSchema: z.object({ model: z.string().describe("Model name from my_models"), api_key: z.string().min(1) }),
    },
    safe(async ({ model, api_key }, ctx) => {
      const user = await requireUser(ctx);
      await setModelKey(user, model, api_key);
      return text(`Key saved on ${model}. Check it with test_model.`);
    }),
  );

  server.registerTool(
    "test_model",
    { title: "Test a model", description: "Send one tiny prompt to check the provider, model id and key work.", inputSchema: z.object({ model: z.string() }) },
    safe(async ({ model }, ctx) => {
      const user = await requireUser(ctx);
      const r = await testModel(user, model);
      return text(`${model} answered in ${r.ms} ms: "${r.text}"`);
    }),
  );

  server.registerTool(
    "set_agent_model",
    {
      title: "Choose an agent's model",
      description: "Pick which of your models runs an agent (its scheduled runs). Omit model to go back to the default.",
      inputSchema: z.object({ agent_id: z.string(), model: z.string().optional() }),
    },
    safe(async ({ agent_id, model }, ctx) => {
      const user = await requireUser(ctx);
      const a = await store.getAgent(agent_id);
      if (!a || a.ownerId !== user.id) throw new Error(`You don't own an agent "${agent_id}".`);
      await setAgentModel(user, a, model);
      return text(model ? `${a.name} now runs on ${model}.` : `${a.name} runs on the default (${DEFAULT_MODEL}).`);
    }),
  );

  server.registerTool(
    "remove_model",
    { title: "Remove a model", description: "Delete one of your models and its key. Agents using it fall back to the default.", inputSchema: z.object({ model: z.string() }) },
    safe(async ({ model }, ctx) => {
      const user = await requireUser(ctx);
      await removeModel(user, model);
      return text(`Removed ${model}.`);
    }),
  );
}
