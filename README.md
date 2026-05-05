# pi-sambanova

A reusable [pi](https://github.com/badlogic/pi) package that adds SambaNova as an OpenAI-compatible model provider.

## Features

- Adds the `sambanova` provider
- Uses SambaCloud's OpenAI-compatible base URL: `https://api.sambanova.ai/v1`
- Adds `sambanova/MiniMax-M2.7` by default
- Includes MiniMax-M2.7 pricing for pi usage/cost display:
  - `$0.60 / 1M` input tokens
  - `$2.40 / 1M` output tokens
- Supports `/login sambanova` by prompting for a SambaNova API key
- Supports `SAMBANOVA_API_KEY` as an environment variable
- Adds `/sambanova-models` to fetch live model IDs from SambaNova's `/v1/models` endpoint and refresh the provider in the current session

## Requirements

- pi with extension/package support
- A SambaNova API key from the SambaCloud portal

## Install

### From npm

After this package is published:

```bash
pi install npm:@zackify/pi-sambanova
```

Then reload pi:

```text
/reload
```

### Manual install

Copy the extension into your global pi extensions directory:

```bash
mkdir -p ~/.pi/agent/extensions/pi-sambanova
cp index.ts ~/.pi/agent/extensions/pi-sambanova/index.ts
```

Or install it only for one project:

```bash
mkdir -p .pi/extensions/pi-sambanova
cp index.ts .pi/extensions/pi-sambanova/index.ts
```

Then reload pi.

## Login

Run:

```text
/login sambanova
```

Paste your SambaNova API key when prompted. The extension opens the SambaCloud API page for convenience.

Alternatively, set an environment variable before starting pi:

```bash
export SAMBANOVA_API_KEY="your-key"
pi
```

## Usage

After installing and logging in, select the model in pi:

```text
/model
```

Choose:

```text
sambanova/MiniMax-M2.7
```

To refresh live SambaNova model IDs and show known pricing:

```text
/sambanova-models
```

Models without known pricing are still added, but show zero/unknown cost until pricing is added to the extension.

## Notes

SambaNova is registered with pi's `openai-completions` API mode. The extension disables newer OpenAI-only request fields that many OpenAI-compatible providers reject, such as `developer` role and `reasoning_effort`.

## Releasing

This repository includes a GitHub Actions workflow that publishes to npm when a GitHub release is created.

1. Add an `NPM_TOKEN` repository secret.
2. Create a GitHub release named like `v1.2.3` or `1.2.3`.
3. The workflow sets `package.json` to that version and runs `npm publish --provenance --access public`.

## Files

- `index.ts` — extension source
- `package.json` — pi package metadata for `@zackify/pi-sambanova`, including the `pi-package` keyword
- `.github/workflows/publish.yml` — npm publish workflow
