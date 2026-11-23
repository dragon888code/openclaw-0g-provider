# openclaw-0g-pc

An [OpenClaw](https://openclaw.ai) provider for [0G Private Computer](https://pc.0g.ai): every chat
model 0G's router serves, sent as OpenAI chat completions to `https://router-api.0g.ai/v1`.

## Install

```sh
openclaw plugins install clawhub:openclaw-0g-pc
export OG_API_KEY=sk-...        # an API key from https://pc.0g.ai
openclaw models list --refresh --provider 0g   # load 0G's model list once
```

Then pick a model such as `0g/glm-5.3-flash`. Keep the key out of chat transcripts: set it in your
shell or through `openclaw onboard --og-api-key`, never paste it into a conversation.

## What it does

- **Models** come from 0G's public catalog (`GET /v1/models`, no key needed) whenever OpenClaw
  refreshes its model list, so new models appear without updating this plugin. Context window,
  output limit, image input and prices are the catalog's. If the catalog cannot be reached, a
  short built-in list is offered (`glm-5.3`, `glm-5.3-flash`, `deepseek-v4-pro`, `kimi-k2.6`,
  `0gm-1.0-35b-a3b`).
- **Reasoning effort** is sent only to models whose catalog entry lists `reasoning_effort`
  (others reject it).
- Requests carry OpenClaw's attribution headers: `X-Title: OpenClaw` and
  `HTTP-Referer: https://openclaw.ai`.

`OG_BASE_URL` points it at another 0G router, e.g. staging (`https://router-api-staging.0g.ai/v1`).

## Disclosure

- Registers one model provider (`0g`) and nothing else: no tools, hooks, commands or background
  processes.
- Network: inference requests go to `router-api.0g.ai` (or `OG_BASE_URL`) through OpenClaw's own
  client with `OG_API_KEY`. Listing models makes one unauthenticated `GET /v1/models` to the same
  host.
- Reads and writes no files; stores no credentials.

## Develop

```sh
npm test                        # catalog mapping
```

## License

MIT
