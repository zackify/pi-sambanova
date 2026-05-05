# pi-sambanova

A reusable [pi](https://github.com/badlogic/pi) package that adds SambaNova as an OpenAI-compatible model provider.

## Features

- Adds the `sambanova` provider
- Uses SambaCloud's OpenAI-compatible base URL: `https://api.sambanova.ai/v1`
- Adds a bundled SambaNova model/pricing list by default
- Includes per-model pricing for pi usage/cost display
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

Choose any bundled SambaNova model, for example:

```text
sambanova/MiniMax-M2.7
```

Bundled models:

| Model | Input / 1M tokens | Output / 1M tokens |
| --- | ---: | ---: |
| `DeepSeek-R1-Distill-Llama-70B` | `$0.70` | `$1.40` |
| `DeepSeek-V3.1-cb` | `$0.15` | `$0.75` |
| `DeepSeek-V3.1` | `$3.00` | `$4.50` |
| `DeepSeek-V3.2` | `$3.00` | `$4.50` |
| `gemma-3-12b-it` | `$0.20` | `$0.35` |
| `gpt-oss-120b` | `$0.22` | `$0.59` |
| `Llama-4-Maverick-17B-128E-Instruct` | `$0.63` | `$1.80` |
| `Meta-Llama-3.3-70B-Instruct` | `$0.60` | `$1.20` |
| `MiniMax-M2.5` | `$0.30` | `$1.20` |
| `MiniMax-M2.7` | `$0.60` | `$2.40` |

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
