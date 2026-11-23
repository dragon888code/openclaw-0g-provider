// OpenClaw provider for 0G Private Computer (https://pc.0g.ai): every chat model 0G's router serves,
// read from its public catalog, sent as OpenAI chat completions. Set OG_API_KEY to use it.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";
import { FALLBACK_MODELS, toModels } from "./models.js";

const PROVIDER = "0g";
// OG_BASE_URL points it elsewhere, e.g. staging (https://router-api-staging.0g.ai/v1).
const BASE_URL = (process.env.OG_BASE_URL || "https://router-api.0g.ai/v1").replace(/\/+$/, "");
// The catalog is public; a slow or unreachable router must not hold up model listing for long.
const CATALOG_TIMEOUT_MS = 10000;
// OpenClaw's own attribution set: 0G's router files these requests under client "openclaw".
const HEADERS = { "HTTP-Referer": "https://openclaw.ai", "X-Title": "OpenClaw" };

async function fetchModels(signal) {
	const timeout = AbortSignal.timeout(CATALOG_TIMEOUT_MS);
	const res = await fetch(`${BASE_URL}/models`, {
		headers: { Accept: "application/json", ...HEADERS },
		signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
	});
	if (!res.ok) throw new Error(`GET ${BASE_URL}/models: HTTP ${res.status}`);
	const body = await res.json();
	if (!Array.isArray(body?.data)) throw new Error(`GET ${BASE_URL}/models: no model list`);
	return toModels(body.data);
}

// Catalog headers reach only the /models fetch, not chat requests (OpenClaw's OpenAI client sends
// those), so the attribution headers are added to every stream here, as OpenClaw's own Requesty
// plugin does. Ours win over a caller's; any other header passes through.
function withAttribution(ctx) {
	if (!ctx.streamFn) return undefined;
	const inner = ctx.streamFn;
	const wrapped = (model, context, options) =>
		inner(model, context, { ...options, headers: { ...options?.headers, ...HEADERS } });
	return Object.assign(wrapped, { preservesGenericCompatibility: true });
}

export default definePluginEntry({
	id: "0g-pc",
	name: "0G Private Computer",
	description: "0G Private Computer model provider",
	register(api) {
		api.registerProvider({
			id: PROVIDER,
			label: "0G Private Computer",
			envVars: ["OG_API_KEY"],
			auth: [
				createProviderApiKeyAuthMethod({
					providerId: PROVIDER,
					methodId: "api-key",
					label: "0G Private Computer API key",
					hint: "API key (sk-...) from https://pc.0g.ai",
					optionKey: "ogApiKey",
					flagName: "--og-api-key",
					envVar: "OG_API_KEY",
					promptMessage: "Enter your 0G Private Computer API key",
					defaultModel: `${PROVIDER}/glm-5.3-flash`,
					expectedProviders: [PROVIDER],
				}),
			],
			catalog: {
				order: "simple",
				run: async (ctx) => {
					const apiKey = ctx.resolveProviderApiKey(PROVIDER).apiKey;
					if (!apiKey) return null;
					let models;
					try {
						models = await fetchModels(ctx.signal);
					} catch (err) {
						api.logger?.warn?.(`[0g] model catalog unavailable (${err.message}); offering the built-in list`);
						models = FALLBACK_MODELS;
					}
					return {
						provider: { baseUrl: BASE_URL, apiKey, api: "openai-completions", headers: HEADERS, models },
					};
				},
			},
			wrapStreamFn: withAttribution,
			wrapSimpleCompletionStreamFn: withAttribution,
		});
	},
});
