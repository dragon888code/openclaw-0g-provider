import assert from "node:assert/strict";
import { test } from "node:test";
import { toModels } from "./models.js";

const glm = {
	id: "glm-5.3",
	name: "GLM-5.3",
	type: "chatbot",
	context_length: 1179648,
	max_completion_tokens: 131072,
	architecture: { input_modalities: ["text"] },
	supported_parameters: ["tools", "reasoning_effort"],
	supported_formats: ["openai", "anthropic"],
	pricing_usd: { prompt: "0.0000014", completion: "0.0000044" },
};

test("maps a chat model, with prices per million tokens", () => {
	const [m] = toModels([glm]);
	assert.equal(m.id, "glm-5.3");
	assert.equal(m.reasoning, true);
	assert.deepEqual(m.compat, { supportsReasoningEffort: true });
	assert.deepEqual(m.cost, { input: 1.4, output: 4.4, cacheRead: 0, cacheWrite: 0 });
	assert.equal(m.contextWindow, 1179648);
	assert.equal(m.maxTokens, 131072);
	assert.deepEqual(m.input, ["text"]);
});

test("a model without reasoning_effort is not sent it", () => {
	const [m] = toModels([{ ...glm, id: "gpt-4.1", supported_parameters: ["tools"] }]);
	assert.equal(m.reasoning, false);
	assert.deepEqual(m.compat, { supportsReasoningEffort: false });
});

test("image input, defaults for missing limits", () => {
	const [m] = toModels([
		{ id: "v", type: "chatbot", architecture: { input_modalities: ["text", "image"] } },
	]);
	assert.deepEqual(m.input, ["text", "image"]);
	assert.equal(m.contextWindow, 128000);
	assert.equal(m.maxTokens, 16384);
});

test("skips non-chat models and models without the OpenAI format", () => {
	const out = toModels([
		{ ...glm, id: "img", type: "image" },
		{ ...glm, id: "anthropic-only", supported_formats: ["anthropic"] },
		{ ...glm, id: "b" },
		{ ...glm, id: "a" },
	]);
	assert.deepEqual(out.map((m) => m.id), ["a", "b"]);
});
