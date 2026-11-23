// Maps 0G's public model catalog (GET https://router-api.0g.ai/v1/models, no key needed) to
// OpenClaw model definitions. Kept free of OpenClaw imports so it can be tested on its own.
// Adapted from pi-0g (https://github.com/jake11-oho/pi-0g, MIT): OpenClaw and pi share the model shape.

/** USD per token (as the catalog gives it) to USD per million tokens (as OpenClaw wants it). */
function perMillion(v) {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? Math.round(n * 1e6 * 1e6) / 1e6 : 0;
}

/** Chat models that take OpenAI chat completions, as OpenClaw model definitions, sorted by id. */
export function toModels(catalog) {
	const out = [];
	for (const m of catalog ?? []) {
		if (!m || typeof m.id !== "string" || m.type !== "chatbot") continue;
		if (m.supported_formats && !m.supported_formats.includes("openai")) continue;
		// Only models that list reasoning_effort get it: some upstreams (gpt-4.1) reject it with a 400.
		const reasoning = (m.supported_parameters ?? []).includes("reasoning_effort");
		out.push({
			id: m.id,
			name: m.name || m.id,
			reasoning,
			input: (m.architecture?.input_modalities ?? []).includes("image") ? ["text", "image"] : ["text"],
			cost: {
				input: perMillion(m.pricing_usd?.prompt),
				output: perMillion(m.pricing_usd?.completion),
				cacheRead: perMillion(m.pricing_usd?.cached_prompt),
				cacheWrite: 0,
			},
			contextWindow: m.context_length || 128000,
			maxTokens: m.max_completion_tokens || 16384,
			compat: { supportsReasoningEffort: reasoning },
		});
	}
	return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** Offered when the catalog cannot be reached: tool-calling chat models, with conservative limits. */
export const FALLBACK_MODELS = ["glm-5.3", "glm-5.3-flash", "deepseek-v4-pro", "kimi-k2.6", "0gm-1.0-35b-a3b"].map(
	(id) => ({
		id,
		name: id,
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16384,
		compat: { supportsReasoningEffort: true },
	}),
);
