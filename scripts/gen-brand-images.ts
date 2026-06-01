#!/usr/bin/env bun
/**
 * gen-brand-images.ts
 *
 * Batch-generate HexAstral brand assets (8 app icons + 3 seals) across
 * Cloudflare Workers AI text-to-image models + OpenAI gpt-image-1.
 *
 * Setup (one-time):
 *   1. Go to https://dash.cloudflare.com/profile/api-tokens
 *   2. "Create Token" -> use template "Workers AI (Beta)" or custom with
 *      Account.Workers AI:Read+Edit permission
 *   3. Copy the token
 *
 * Usage:
 *   # Set tokens (or put in scripts/.env):
 *   export CLOUDFLARE_API_TOKEN="xxx"
 *   export OPENAI_API_KEY="xxx"          # optional, for gpt-image-1
 *
 *   # List available models:
 *   bun scripts/gen-brand-images.ts --list-models
 *
 *   # Generate ALL usable models x ALL subjects:
 *   bun scripts/gen-brand-images.ts
 *
 *   # Generate specific model(s):
 *   bun scripts/gen-brand-images.ts --model flux-1-schnell
 *   bun scripts/gen-brand-images.ts --model phoenix
 *
 *   # Generate specific subject(s):
 *   bun scripts/gen-brand-images.ts --subject dream --subject fate
 *
 *   # Only seals / only apps:
 *   bun scripts/gen-brand-images.ts --seals-only
 *   bun scripts/gen-brand-images.ts --apps-only
 *
 *   # Adjust concurrency (default 2, be kind to API):
 *   bun scripts/gen-brand-images.ts --concurrency 4
 *
 * Output:
 *   docs/design/raw/{model-short-name}/{subject}.png
 *   docs/design/raw/compare.html   <- side-by-side comparison page
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// Load .env from scripts/.env if present
// ---------------------------------------------------------------------------
const envPath = join(import.meta.dir, ".env");
if (existsSync(envPath)) {
	const lines = readFileSync(envPath, "utf-8").split("\n");
	for (const line of lines) {
		const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
		if (match && !process.env[match[1]]) {
			process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
		}
	}
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACCOUNT_ID =
	process.env.CF_ACCOUNT_ID || "e4f7d0771f5e2430f42c5842f7d260c1";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OUT_DIR = join(import.meta.dir, "../docs/design/raw");

// ---------------------------------------------------------------------------
// House Style
// ---------------------------------------------------------------------------

const HOUSE_STYLE = [
	"Chinese ink-wash logo mark (shuimo): bold black ink on warm aged rice paper,",
	"confident brushwork with flying-white dry-brush texture, wet bleeding organic edges;",
	"designed as an APP ICON — one bold iconic shape, strong silhouette recognizable",
	"at small sizes, NO fine detail; subject fills the central area with even paper",
	"margin all around (nothing touching edges or corners); monochrome ink, minimal,",
	"serene and arcane; NO seal stamp, no text, no border, no watermark; square 1:1.",
].join(" ");

// ---------------------------------------------------------------------------
// 8 App Subjects
// ---------------------------------------------------------------------------

const APP_SUBJECTS: Record<string, { name: string; prompt: string }> = {
	fate: {
		name: "FATE",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: one large celestial sphere in deep black ink, a single bold diagonal stroke of pale light from lower-right; nearly all black, maximum contrast, the sphere IS the logo.`,
	},
	bond: {
		name: "BOND",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: two spheres pressed together as one form — one pale, one dark (yin-yang); they share a boundary, read as a single unit not two separate objects.`,
	},
	almanac: {
		name: "ALMANAC",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: a bold ink sun disc at center with one thin elliptical orbit ring around it; diagrammatic, clean, like an ancient astronomical chart reduced to its essence; NO Earth markers, NO labels.`,
	},
	visage: {
		name: "VISAGE",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: a bold human profile in side view where the forehead-nose-chin contour doubles as a mountain ridgeline; ONE continuous ink silhouette, face and mountain are the same shape; no background landscape, just the one form.`,
	},
	fengshui: {
		name: "FENGSHUI",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: a single confident spiral of ink (like a dragon-vein / qi current), broad strokes coiling inward to a still center; abstract, bold, reads as a spiral mark; NOT wispy or diffuse — strong brushwork.`,
	},
	coin: {
		name: "COIN",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: three Chinese cash coins (round with square center hole) stacked / overlapping; bold ink with stone-rubbing texture; read as one compact cluster, not spread out; inscription kept vague / impressionistic.`,
	},
	dream: {
		name: "DREAM",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: one butterfly viewed from above, wings fully spread and symmetrical, bold ink-wash; the butterfly IS the entire logo — no moon, no background elements; wings show flying-white texture but overall form is simple and bold.`,
	},
	numbers: {
		name: "NUMBERS",
		prompt: `${HOUSE_STYLE}\n\nSUBJECT: one bare branch with a single prominent five-petal plum blossom; the branch is dry-brush, the bloom is the focal point; spare composition, NOT a busy spray of flowers.`,
	},
};

// ---------------------------------------------------------------------------
// 3 Seals — each with its OWN distinct style (不拘一格)
// Reference: real hand-carved stone seals with varied styles
// ---------------------------------------------------------------------------

const SEAL_SUBJECTS: Record<string, { name: string; prompt: string }> = {
	"seal-ming": {
		name: "SEAL-MING",
		prompt: [
			"A hand-carved Chinese stone seal stamp (篆刻 zhuanke) pressed onto aged rice paper.",
			"The single character 命 (ming, fate) in angular Zhongshan-kingdom bronze inscription",
			"style (中山篆): sharp geometric strokes, distinctive elongated verticals, archaic and",
			"powerful. RELIEF carving (朱文 zhuwen) — character prints in cinnabar-red. Tall",
			"rectangular seal border, double-line frame, slightly chipped and worn stone edges.",
			"Character structure: roofed 亼 top, 口 middle, kneeling 卩 bottom. Generous padding",
			"inside border. The seal impression shows natural ink bleeding and pressure variation.",
			"Flat archival scan on warm paper. Square 1:1, centered. NO other elements.",
		].join(" "),
	},
	"seal-xiang": {
		name: "SEAL-XIANG",
		prompt: [
			"A hand-carved Chinese stone seal stamp (篆刻 zhuanke) pressed onto aged rice paper.",
			"The single character 相 (xiang, physiognomy) in flowing miao-zhuan (缪篆) style with",
			"interlocking curved strokes filling the seal face organically. INTAGLIO carving (白文",
			"baiwen) — character appears as negative white space cut into a solid cinnabar-red",
			"ground. Rounded square seal shape, organically worn edges. Left component: tree",
			"radical 木 with branching top. Right component: angular eye 目 with bars. Strokes",
			"connect to border edges in classical Han-seal manner. Natural stone texture, uneven",
			"ink pressure. Flat archival scan on warm paper. Square 1:1, centered. NO other elements.",
		].join(" "),
	},
	"seal-bu": {
		name: "SEAL-BU",
		prompt: [
			"A hand-carved Chinese stone seal stamp (篆刻 zhuanke) pressed onto aged rice paper.",
			"The single character 卜 (bu, divination) in oracle-bone inscription style (甲骨文):",
			"raw, primitive, ancient. Extremely minimal — one bold vertical crack-line with one",
			"short diagonal branch to the upper right. FREEFORM seal shape — irregular natural",
			"stone edge, rough-hewn, NOT a clean geometric border. Cinnabar-red on warm paper,",
			"dry and scratchy ancient texture. The character is large and dominant, taking up most",
			"of the seal face. Flat archival scan on warm paper. Square 1:1, centered.",
			"NO other elements.",
		].join(" "),
	},
};

const ALL_SUBJECTS = { ...APP_SUBJECTS, ...SEAL_SUBJECTS };

// ---------------------------------------------------------------------------
// Cloudflare Workers AI models (text-to-image, excluding img2img/inpainting)
// ---------------------------------------------------------------------------

const CF_MODELS: { id: string; shortName: string; steps: number }[] = [
	{ id: "@cf/black-forest-labs/flux-1-schnell", shortName: "flux-1-schnell", steps: 8 },
	{ id: "@cf/black-forest-labs/flux-2-klein-4b", shortName: "flux-2-klein-4b", steps: 8 },
	{ id: "@cf/black-forest-labs/flux-2-klein-9b", shortName: "flux-2-klein-9b", steps: 8 },
	{ id: "@cf/black-forest-labs/flux-2-dev", shortName: "flux-2-dev", steps: 20 },
	{ id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", shortName: "sdxl-base", steps: 20 },
	{ id: "@cf/bytedance/stable-diffusion-xl-lightning", shortName: "sdxl-lightning", steps: 8 },
	{ id: "@cf/lykon/dreamshaper-8-lcm", shortName: "dreamshaper-8", steps: 8 },
	{ id: "@cf/leonardo/phoenix-1.0", shortName: "phoenix-1.0", steps: 20 },
	{ id: "@cf/leonardo/lucid-origin", shortName: "lucid-origin", steps: 20 },
];

// ---------------------------------------------------------------------------
// Generate via Cloudflare Workers AI
// ---------------------------------------------------------------------------

async function generateCf(
	modelId: string,
	prompt: string,
	steps: number,
): Promise<{ buf: ArrayBuffer | null; ms: number }> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${modelId}`;

	const body: Record<string, unknown> = { prompt, width: 1024, height: 1024 };

	// Different models use different step param names
	if (modelId.includes("flux")) {
		body.num_steps = steps;
	} else {
		body.num_steps = steps;
	}

	const t0 = Date.now();
	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${CF_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(120_000),
		});
	} catch (err) {
		return { buf: null, ms: Date.now() - t0 };
	}

	const ms = Date.now() - t0;

	if (!res.ok) {
		const errText = await res.text().catch(() => "");
		console.error(`    ERR ${res.status}: ${errText.slice(0, 200)}`);
		return { buf: null, ms };
	}

	const contentType = res.headers.get("content-type") || "";
	if (contentType.includes("image/")) {
		return { buf: await res.arrayBuffer(), ms };
	}

	// JSON response with base64 image
	try {
		const json = (await res.json()) as Record<string, unknown>;
		const result = json.result as Record<string, unknown> | undefined;
		const b64 = (result?.image as string) || (json.image as string);
		if (b64) {
			return { buf: Buffer.from(b64, "base64").buffer, ms };
		}
	} catch {}

	return { buf: null, ms };
}

// ---------------------------------------------------------------------------
// Generate via OpenAI gpt-image-1
// ---------------------------------------------------------------------------

async function generateOpenAI(
	prompt: string,
): Promise<{ buf: ArrayBuffer | null; ms: number }> {
	const t0 = Date.now();

	let res: Response;
	try {
		res = await fetch("https://api.openai.com/v1/images/generations", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${OPENAI_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-image-1",
				prompt,
				n: 1,
				size: "1024x1024",
				quality: "high",
			}),
			signal: AbortSignal.timeout(120_000),
		});
	} catch {
		return { buf: null, ms: Date.now() - t0 };
	}

	const ms = Date.now() - t0;

	if (!res.ok) {
		const errText = await res.text().catch(() => "");
		console.error(`    ERR ${res.status}: ${errText.slice(0, 200)}`);
		return { buf: null, ms };
	}

	try {
		const json = (await res.json()) as {
			data: { b64_json?: string; url?: string }[];
		};
		const item = json.data[0];
		if (item?.b64_json) {
			return { buf: Buffer.from(item.b64_json, "base64").buffer, ms };
		}
		if (item?.url) {
			const imgRes = await fetch(item.url);
			return { buf: await imgRes.arrayBuffer(), ms };
		}
	} catch {}

	return { buf: null, ms };
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

function saveImage(modelShort: string, subjectKey: string, buf: ArrayBuffer): string {
	const dir = join(OUT_DIR, modelShort);
	mkdirSync(dir, { recursive: true });
	const ext = detectExt(buf);
	const filePath = join(dir, `${subjectKey}.${ext}`);
	writeFileSync(filePath, Buffer.from(buf));
	return filePath;
}

function detectExt(buf: ArrayBuffer): string {
	const u8 = new Uint8Array(buf);
	// PNG magic: 137 80 78 71
	if (u8[0] === 0x89 && u8[1] === 0x50) return "png";
	// JPEG magic: FF D8 FF
	if (u8[0] === 0xff && u8[1] === 0xd8) return "jpg";
	// WebP: RIFF....WEBP
	if (u8[0] === 0x52 && u8[8] === 0x57) return "webp";
	return "png";
}

// ---------------------------------------------------------------------------
// Comparison HTML generator
// ---------------------------------------------------------------------------

function generateCompareHTML(
	results: { model: string; subject: string; path: string; ms: number }[],
	subjectKeys: string[],
	modelNames: string[],
) {
	const rows = subjectKeys
		.map((sk) => {
			const cells = modelNames
				.map((mn) => {
					const r = results.find((x) => x.model === mn && x.subject === sk);
					if (!r) return `<td class="miss">--</td>`;
					const rel = relative(OUT_DIR, r.path);
					return `<td><img src="${rel}" loading="lazy" onclick="window.open('${rel}')"><span class="ms">${(r.ms / 1000).toFixed(1)}s</span></td>`;
				})
				.join("\n        ");
			const label = ALL_SUBJECTS[sk]?.name || sk;
			return `    <tr>\n      <th>${label}<br><small>${sk}</small></th>\n        ${cells}\n    </tr>`;
		})
		.join("\n");

	const headers = modelNames.map((m) => `<th>${m}</th>`).join("");

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HexAstral Brand Image Comparison</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font: 13px/1.4 system-ui, sans-serif; background: #111; color: #ddd; padding: 20px; }
h1 { font-size: 18px; margin-bottom: 12px; color: #E9E2D2; }
table { border-collapse: collapse; }
th, td { border: 1px solid #333; padding: 6px; text-align: center; vertical-align: top; }
th { background: #1a1a1a; position: sticky; top: 0; z-index: 2; font-size: 12px; min-width: 80px; }
tr th:first-child { position: sticky; left: 0; z-index: 3; background: #1a1a1a; }
td img { width: 180px; height: 180px; object-fit: cover; border-radius: 4px; cursor: pointer;
         transition: transform 0.2s; display: block; margin: 0 auto; }
td img:hover { transform: scale(2.5); z-index: 10; position: relative; }
.ms { display: block; font-size: 10px; color: #666; margin-top: 2px; }
.miss { color: #555; }
small { color: #666; }
.note { margin: 12px 0; color: #888; font-size: 12px; }
</style>
</head>
<body>
<h1>HexAstral Brand Image Comparison</h1>
<p class="note">Hover to zoom. Click to open full size. Generated ${new Date().toISOString().slice(0, 16)}</p>
<div style="overflow:auto; max-height: 95vh;">
<table>
  <thead><tr><th>Subject</th>${headers}</tr></thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>
</body>
</html>`;

	const htmlPath = join(OUT_DIR, "compare.html");
	writeFileSync(htmlPath, html);
	return htmlPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const { values } = parseArgs({
		options: {
			"list-models": { type: "boolean", default: false },
			model: { type: "string", multiple: true, default: [] },
			subject: { type: "string", multiple: true, default: [] },
			"seals-only": { type: "boolean", default: false },
			"apps-only": { type: "boolean", default: false },
			concurrency: { type: "string", default: "2" },
		},
		strict: false,
	});

	// ---- Validate tokens ----
	if (!CF_TOKEN && !OPENAI_KEY) {
		console.error(`
  No API tokens found. Set at least one:

  export CLOUDFLARE_API_TOKEN="xxx"
    Create at: https://dash.cloudflare.com/profile/api-tokens
    Template: "Workers AI" or custom with Account.Workers AI permission

  export OPENAI_API_KEY="xxx"       (optional, for gpt-image-1)

  Or create scripts/.env with these values.
`);
		process.exit(1);
	}

	// ---- List models mode ----
	if (values["list-models"]) {
		console.log("\n  Cloudflare Workers AI (Text-to-Image):\n");
		for (const m of CF_MODELS) {
			const status = CF_TOKEN ? "ready" : "needs CLOUDFLARE_API_TOKEN";
			console.log(`    ${m.shortName.padEnd(25)} ${m.id.padEnd(50)} [${status}]`);
		}
		console.log(`\n    Total: ${CF_MODELS.length} models`);
		console.log(
			`\n  OpenAI:  gpt-image-1  ${OPENAI_KEY ? "[ready]" : "[needs OPENAI_API_KEY]"}`,
		);
		console.log();
		return;
	}

	// ---- Build subject list ----
	let subjectKeys = Object.keys(ALL_SUBJECTS);
	if (values["seals-only"]) {
		subjectKeys = subjectKeys.filter((k) => k.startsWith("seal-"));
	} else if (values["apps-only"]) {
		subjectKeys = subjectKeys.filter((k) => !k.startsWith("seal-"));
	}
	if ((values.subject as string[]).length > 0) {
		subjectKeys = subjectKeys.filter((k) =>
			(values.subject as string[]).some(
				(s) =>
					k.includes(s) ||
					ALL_SUBJECTS[k].name.toLowerCase().includes(s.toLowerCase()),
			),
		);
	}

	if (subjectKeys.length === 0) {
		console.error("No subjects matched. Available:", Object.keys(ALL_SUBJECTS).join(", "));
		process.exit(1);
	}

	// ---- Build model list ----
	type ModelEntry = {
		shortName: string;
		generate: (prompt: string) => Promise<{ buf: ArrayBuffer | null; ms: number }>;
	};

	let models: ModelEntry[] = [];

	if (CF_TOKEN) {
		models.push(
			...CF_MODELS.map((m) => ({
				shortName: m.shortName,
				generate: (prompt: string) => generateCf(m.id, prompt, m.steps),
			})),
		);
	}

	if (OPENAI_KEY) {
		models.push({
			shortName: "gpt-image-1",
			generate: generateOpenAI,
		});
	}

	// Filter by --model flag
	if ((values.model as string[]).length > 0) {
		models = models.filter((m) =>
			(values.model as string[]).some((f) => m.shortName.includes(f)),
		);
	}

	if (models.length === 0) {
		console.error("No models available. Check API tokens or --model filter.");
		process.exit(1);
	}

	const concurrency = Math.max(1, Number.parseInt(values.concurrency as string, 10) || 2);
	const total = models.length * subjectKeys.length;

	console.log(`
  HexAstral Brand Image Generator
  ================================
  Models:      ${models.length} (${models.map((m) => m.shortName).join(", ")})
  Subjects:    ${subjectKeys.length} (${subjectKeys.join(", ")})
  Total:       ${total} images
  Concurrency: ${concurrency}
  Output:      ${OUT_DIR}/
`);

	// ---- Generate ----
	const results: { model: string; subject: string; path: string; ms: number }[] = [];
	const errors: string[] = [];
	let done = 0;

	const jobs = models.flatMap((model) =>
		subjectKeys.map((subjectKey) => ({ model, subjectKey })),
	);

	// Simple semaphore for concurrency
	let active = 0;
	const queue = [...jobs];

	async function processNext(): Promise<void> {
		while (queue.length > 0) {
			if (active >= concurrency) {
				await new Promise((r) => setTimeout(r, 200));
				continue;
			}

			const job = queue.shift();
			if (!job) break;

			active++;
			const { model, subjectKey } = job;
			const subject = ALL_SUBJECTS[subjectKey];
			const tag = `[${model.shortName}/${subjectKey}]`;

			process.stdout.write(`  ${tag} generating... `);

			try {
				const { buf, ms } = await model.generate(subject.prompt);
				done++;

				if (buf && buf.byteLength > 100) {
					const path = saveImage(model.shortName, subjectKey, buf);
					results.push({ model: model.shortName, subject: subjectKey, path, ms });
					const sizeKB = Math.round(buf.byteLength / 1024);
					console.log(`OK ${(ms / 1000).toFixed(1)}s ${sizeKB}KB  [${done}/${total}]`);
				} else {
					errors.push(`${tag} empty response`);
					console.log(`SKIP (no image)  [${done}/${total}]`);
				}
			} catch (err) {
				done++;
				const msg = err instanceof Error ? err.message : String(err);
				errors.push(`${tag} ${msg.slice(0, 100)}`);
				console.log(`ERROR: ${msg.slice(0, 80)}  [${done}/${total}]`);
			}

			active--;
		}
	}

	// Run workers
	const workers = Array.from({ length: concurrency }, () => processNext());
	await Promise.all(workers);

	// ---- Generate comparison HTML ----
	const modelNames = [...new Set(results.map((r) => r.model))];
	if (results.length > 0) {
		const htmlPath = generateCompareHTML(results, subjectKeys, modelNames);
		console.log(`\n  Comparison page: ${htmlPath}`);
	}

	// ---- Summary ----
	console.log(`
  ================================
  Done: ${results.length}/${total} images generated
  ${errors.length > 0 ? `Errors: ${errors.length}` : "No errors"}`);

	if (errors.length > 0) {
		console.log("  Failures:");
		for (const e of errors) {
			console.log(`    - ${e}`);
		}
	}

	console.log(`
  Next steps:
    1. Open docs/design/raw/compare.html to compare models side-by-side
    2. Pick the best model(s) for each subject type (icons vs seals)
    3. Re-run with --model <best> to generate more variants
`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
