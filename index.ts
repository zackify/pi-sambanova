import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@mariozechner/pi-ai";

const PROVIDER = "sambanova";
const BASE_URL = "https://api.sambanova.ai/v1";
const API_KEY_ENV = "SAMBANOVA_API_KEY";

const KNOWN_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
	// $0.60 / 1M input tokens, $2.40 / 1M output tokens.
	"MiniMax-M2.7": { input: 0.6, output: 2.4, cacheRead: 0, cacheWrite: 0 },
};

const DEFAULT_MODELS = [makeModel("MiniMax-M2.7")];

type SambaNovaModel = ReturnType<typeof makeModel>;

function makeModel(id: string): {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
	compat: {
		supportsDeveloperRole: boolean;
		supportsReasoningEffort: boolean;
		maxTokensField: "max_tokens";
	};
} {
	return {
		id,
		name: id,
		reasoning: false,
		input: ["text"],
		cost: KNOWN_PRICES[id] ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16384,
		compat: {
			// SambaNova is OpenAI-compatible, but some hosted OpenAI-compatible backends
			// do not accept newer OpenAI-only fields.
			supportsDeveloperRole: false,
			supportsReasoningEffort: false,
			maxTokensField: "max_tokens",
		},
	};
}

function registerSambaNova(pi: ExtensionAPI, models: SambaNovaModel[] = DEFAULT_MODELS) {
	pi.registerProvider(PROVIDER, {
		name: "SambaNova",
		baseUrl: BASE_URL,
		apiKey: API_KEY_ENV,
		api: "openai-completions",
		models,
		oauth: {
			name: "SambaNova API key",
			async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
				callbacks.onAuth({ url: "https://cloud.sambanova.ai/apis" });
				const apiKey = (await callbacks.onPrompt({ message: "Paste your SambaNova API key:" })).trim();
				if (!apiKey) throw new Error("No SambaNova API key provided");
				return {
					access: apiKey,
					refresh: apiKey,
					expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 20,
				};
			},
			async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
				return {
					access: credentials.access || credentials.refresh,
					refresh: credentials.refresh || credentials.access,
					expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 20,
				};
			},
			getApiKey: (credentials: OAuthCredentials) => credentials.access,
		},
	});
}

async function fetchSambaNovaModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
	const response = await fetch(`${BASE_URL}/models`, {
		headers: { Authorization: `Bearer ${apiKey}` },
		signal,
	});
	if (!response.ok) throw new Error(`SambaNova /models failed: ${response.status} ${await response.text()}`);
	const payload = (await response.json()) as { data?: Array<{ id?: string; name?: string }> };
	return [...new Set((payload.data ?? []).map((model) => model.id ?? model.name).filter(Boolean) as string[])].sort();
}

function renderModelList(modelIds: string[]) {
	return modelIds
		.map((id) => {
			const price = KNOWN_PRICES[id];
			const priceText = price ? `$${price.input}/M in, $${price.output}/M out` : "price unknown";
			return `- ${PROVIDER}/${id} (${priceText})`;
		})
		.join("\n");
}

export default function (pi: ExtensionAPI) {
	registerSambaNova(pi);

	pi.registerCommand("sambanova-models", {
		description: "Show SambaNova models and refresh live model IDs when logged in",
		handler: async (_args, ctx) => {
			const apiKey = await ctx.modelRegistry.getApiKeyForProvider(PROVIDER);
			if (!apiKey) {
				ctx.ui.notify(
					`SambaNova provider loaded with MiniMax-M2.7. Run /login ${PROVIDER} or set ${API_KEY_ENV} to refresh live models.\n${renderModelList(DEFAULT_MODELS.map((m) => m.id))}`,
					"info",
				);
				return;
			}

			const liveIds = await fetchSambaNovaModels(apiKey, ctx.signal);
			const ids = liveIds.includes("MiniMax-M2.7") ? liveIds : ["MiniMax-M2.7", ...liveIds];
			registerSambaNova(pi, ids.map(makeModel));
			ctx.ui.notify(`SambaNova models refreshed:\n${renderModelList(ids)}`, "success");
		},
	});
}
