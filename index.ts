import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@mariozechner/pi-ai";

const PROVIDER = "sambanova";
const BASE_URL = "https://api.sambanova.ai/v1";
const API_KEY_ENV = "SAMBANOVA_API_KEY";

const MODEL_IDS = [
	"DeepSeek-R1-Distill-Llama-70B",
	"DeepSeek-V3.1-cb",
	"DeepSeek-V3.1",
	"DeepSeek-V3.2",
	"gemma-3-12b-it",
	"gpt-oss-120b",
	"Llama-4-Maverick-17B-128E-Instruct",
	"Meta-Llama-3.3-70B-Instruct",
	"MiniMax-M2.5",
	"MiniMax-M2.7",
] as const;

const KNOWN_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
	"DeepSeek-R1-Distill-Llama-70B": { input: 0.7, output: 1.4, cacheRead: 0, cacheWrite: 0 },
	"DeepSeek-V3.1-cb": { input: 0.15, output: 0.75, cacheRead: 0, cacheWrite: 0 },
	"DeepSeek-V3.1": { input: 3, output: 4.5, cacheRead: 0, cacheWrite: 0 },
	"DeepSeek-V3.2": { input: 3, output: 4.5, cacheRead: 0, cacheWrite: 0 },
	"gemma-3-12b-it": { input: 0.2, output: 0.35, cacheRead: 0, cacheWrite: 0 },
	"gpt-oss-120b": { input: 0.22, output: 0.59, cacheRead: 0, cacheWrite: 0 },
	"Llama-4-Maverick-17B-128E-Instruct": { input: 0.63, output: 1.8, cacheRead: 0, cacheWrite: 0 },
	"Meta-Llama-3.3-70B-Instruct": { input: 0.6, output: 1.2, cacheRead: 0, cacheWrite: 0 },
	"MiniMax-M2.5": { input: 0.3, output: 1.2, cacheRead: 0, cacheWrite: 0 },
	"MiniMax-M2.7": { input: 0.6, output: 2.4, cacheRead: 0, cacheWrite: 0 },
};

const DEFAULT_MODELS = MODEL_IDS.map(makeModel);

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
					`SambaNova provider loaded with bundled model/pricing list. Run /login ${PROVIDER} or set ${API_KEY_ENV} to refresh live models.\n${renderModelList(DEFAULT_MODELS.map((m) => m.id))}`,
					"info",
				);
				return;
			}

			const liveIds = await fetchSambaNovaModels(apiKey, ctx.signal);
			const ids = [...new Set([...MODEL_IDS, ...liveIds])];
			registerSambaNova(pi, ids.map(makeModel));
			ctx.ui.notify(`SambaNova models refreshed:\n${renderModelList(ids)}`, "success");
		},
	});
}
