// Builds the ChatGPT plugin ZIP from this repo, the same skills Claude Code uses:
// 1. checks plugin.json, mcp.json, skills/ and assets/ against OpenAI's upload and submission rules
//    (developers.openai.com/plugins/deploy/submission) and stops with every problem listed;
// 2. zips only plugin.json, mcp.json, skills/ and assets/ to dist/piku-chatgpt-<version>.zip, plugin.json
//    at the root. .claude-plugin/ and .mcp.json stay out: ChatGPT would convert them.
// `--check` only checks. Run: node scripts/build-chatgpt.mjs. Uses the system `zip`, no packages.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://usepiku.com";
const MCP_URL = `${SITE}/mcp`;
const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const LIMITS = { name: 64, displayName: 30, shortDescription: 30, longDescription: 4000, developerName: 80, capabilities: 20, capability: 120, url: 1024, prompts: 3, prompt: 128, description: 4000, skillDescription: 1024, skillName: 64, iconMin: 48, iconMax: 4096, iconBytes: 5 * 1024 * 1024 };

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

// The package: plugin.json, mcp.json and every file under skills/ and assets/ (dotfiles like .DS_Store left out).
const files = new Map();
const walk = (d) => {
  for (const name of readdirSync(d)) {
    if (name.startsWith(".")) continue;
    const full = join(d, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.set(relative(root, full).split("\\").join("/"), new Uint8Array(readFileSync(full)));
  }
};
for (const f of ["plugin.json", "mcp.json"]) if (existsSync(join(root, f))) files.set(f, new Uint8Array(readFileSync(join(root, f))));
for (const d of ["skills", "assets"]) if (existsSync(join(root, d))) walk(join(root, d));

const json = (path) => { try { return JSON.parse(new TextDecoder().decode(files.get(path))); } catch { return null; } };
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v) => typeof v === "string" && v.trim().length > 0;
const httpsUrl = (v) => { try { return str(v) && new URL(v).protocol === "https:" && !new URL(v).username; } catch { return false; } };
const pngSize = (b) => {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!b || b.length < 24 || sig.some((x, i) => b[i] !== x)) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
};

const errors = [];
const need = (ok, message) => { if (!ok) errors.push(message); };

// plugin.json
const manifest = json("plugin.json");
const m = isObj(manifest) ? manifest : {};
need(isObj(manifest), "plugin.json is missing or not a JSON object.");
need(m.$schema === PLUGIN_SCHEMA, `plugin.json $schema must be ${PLUGIN_SCHEMA}.`);
need(typeof m.name === "string" && m.name.length <= LIMITS.name && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.name), "plugin.json name must be lowercase letters, numbers and single hyphens, 64 characters at most.");
need(typeof m.version === "string" && /^\d+\.\d+\.\d+$/.test(m.version), "plugin.json version must be a semantic version like 1.0.0.");
need(typeof m.description !== "string" || m.description.length <= LIMITS.description, "plugin.json description is over 4000 characters.");

const o = isObj(m.extensions) && isObj(m.extensions["com.openai"]) ? m.extensions["com.openai"] : {};
need(isObj(m.extensions) && isObj(m.extensions["com.openai"]), "plugin.json needs extensions.com.openai.");
for (const k of ["apps", "hooks"]) need(!(k in o), `extensions.com.openai.${k} cannot be submitted yet: remove it.`);
const i = isObj(o.interface) ? o.interface : {};
need(isObj(o.interface), "extensions.com.openai.interface is missing.");
const text = (k, max) => need(str(i[k]) && i[k].length <= max, `interface.${k} is required, ${max} characters at most.`);
text("displayName", LIMITS.displayName);
text("shortDescription", LIMITS.shortDescription);
text("longDescription", LIMITS.longDescription);
text("developerName", LIMITS.developerName);
need(str(i.category), "interface.category is required.");
need(!("capabilities" in i) || (Array.isArray(i.capabilities) && i.capabilities.length <= LIMITS.capabilities && i.capabilities.every((c) => str(c) && c.length <= LIMITS.capability)), "interface.capabilities: at most 20 labels of 120 characters.");
for (const k of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  need(httpsUrl(i[k]) && i[k].length <= LIMITS.url, `interface.${k} must be an https URL.`);
  need(!str(i[k]) || i[k].startsWith(SITE), `interface.${k} must be on ${SITE} (the same publisher).`);
}
const prompts = Array.isArray(i.defaultPrompt) ? i.defaultPrompt : i.defaultPrompt === undefined ? [] : [i.defaultPrompt];
need(prompts.length <= LIMITS.prompts, "interface.defaultPrompt: three prompts at most.");
need(new Set(prompts).size === prompts.length, "interface.defaultPrompt: prompts must differ.");
for (const q of prompts) need(str(q) && q.length <= LIMITS.prompt && !q.includes("@"), `interface.defaultPrompt "${String(q).slice(0, 40)}": 128 characters at most, no @mentions.`);
need(i.brandColor === undefined || (typeof i.brandColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(i.brandColor)), "interface.brandColor must be #RRGGBB.");

// The listing copy: no Piku pricing or promotions, no comparisons, no emojis or italics.
const copy = [i.displayName, i.shortDescription, i.longDescription, ...(i.capabilities ?? []), ...prompts].join("\n");
need(!/\bfree\b|trial|\bplan\b|subscription|per month|\/mo\b|\bfee\b|cheaper|better than|unlike|\bvs\b/i.test(copy), "The listing copy names pricing, a plan or a comparison: remove it.");
need(!/\p{Extended_Pictographic}|(^|\s)[*_][^*_\s]/u.test(copy), "The listing copy has an emoji or italics: remove it.");

for (const k of ["logo", "composerIcon", "logoDark", "composerIconDark"]) {
  if (i[k] === undefined) { need(k.endsWith("Dark"), `interface.${k} is required.`); continue; }
  const path = String(i[k]);
  need(path.startsWith("./assets/"), `interface.${k} must be a ./assets/ path.`);
  const bytes = files.get(path.replace(/^\.\//, ""));
  if (!bytes) { errors.push(`interface.${k}: ${path} is not in the package.`); continue; }
  need(bytes.byteLength <= LIMITS.iconBytes, `${path} is over 5 MiB.`);
  const size = pngSize(bytes);
  need(size && size.width === size.height && size.width >= LIMITS.iconMin && size.width <= LIMITS.iconMax, `${path} must be a square PNG from 48 to 4096 pixels.`);
}

if (isObj(o.review)) {
  const cases = isObj(o.review.test_cases) ? o.review.test_cases : {};
  const pos = Array.isArray(cases.positive) ? cases.positive : [], neg = Array.isArray(cases.negative) ? cases.negative : [];
  need(pos.length === 5 && neg.length === 3, "review.test_cases needs exactly five positive and three negative cases.");
  for (const c of [...pos, ...neg]) need(isObj(c) && str(c.description) && str(c.prompt), "Every review case needs a description and a prompt.");
  for (const c of pos) need(isObj(c) && str(c.tools_triggered) && str(c.expected_behavior), "Every positive review case needs tools_triggered and expected_behavior.");
  for (const k of ["test_credentials", "reviewer_instructions"]) need(!(k in o.review), `review.${k} is not allowed in the package: enter it in the dashboard.`);
}
const pub = isObj(o.publication) ? o.publication : null;
need(pub && Array.isArray(pub.countries) && pub.countries.every((c) => typeof c === "string" && /^[A-Z]{2}$/.test(c)), "publication.countries must be a list of country codes ([] for everywhere).");

// mcp.json
const mcp = isObj(json("mcp.json")) ? json("mcp.json") : {};
need(mcp.$schema === MCP_SCHEMA, `mcp.json $schema must be ${MCP_SCHEMA}.`);
const servers = isObj(mcp.mcpServers) ? Object.values(mcp.mcpServers) : [];
need(servers.length === 1, "mcp.json must have exactly one server.");
const s = isObj(servers[0]) ? servers[0] : {};
need(s.type === "streamable-http", "The MCP server must be streamable-http.");
need(s.url === MCP_URL, `The MCP server url must be ${MCP_URL}.`);
need(!isObj(s.headers) || Object.keys(s.headers).length === 0, "The MCP server cannot carry headers.");

// skills/<name>/SKILL.md: YAML front matter with name (matching its folder) and description.
const skills = [...files.keys()].filter((p) => /^skills\/[^/]+\/SKILL\.md$/.test(p)).sort();
need(skills.length > 0, "skills/ has no SKILL.md.");
for (const path of skills) {
  const dir = path.split("/")[1];
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(new TextDecoder().decode(files.get(path)));
  const field = (k) => fm && (new RegExp(`^${k}:\\s*(.+)$`, "m").exec(fm[1])?.[1] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
  need(fm, `${path} needs YAML front matter between --- lines.`);
  const name = field("name"), description = field("description");
  need(name === dir, `${path}: name must be "${dir}", its folder.`);
  need(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? ""), `${path}: name must be lowercase letters, numbers and single hyphens.`);
  need(`${m.name}:${name}`.length <= LIMITS.skillName, `${path}: "${m.name}:${name}" is over 64 characters.`);
  need(str(description) && description.length <= LIMITS.skillDescription, `${path}: description is required, 1024 characters at most.`);
}

for (const path of files.keys()) need(!/(^|\/)(hooks\/|\.app\.json$|\.codex-plugin\/|\.claude-plugin\/|\.mcp\.json$)/.test(path), `${path} cannot be in the ChatGPT package.`);

if (errors.length) {
  console.error(`The ChatGPT plugin is not ready (${errors.length}):\n${errors.map((e) => `- ${e}`).join("\n")}`);
  process.exit(1);
}
if (checkOnly) {
  console.log(`ChatGPT plugin checks pass (${files.size} files, skills: ${skills.map((p) => p.split("/")[1]).join(", ")}).`);
  process.exit(0);
}

const out = join(root, "dist", `piku-chatgpt-${m.version}.zip`);
mkdirSync(join(root, "dist"), { recursive: true });
rmSync(out, { force: true });
execFileSync("zip", ["-q", "-X", out, ...[...files.keys()].sort()], { cwd: root, stdio: "inherit" });
console.log(`ChatGPT plugin: ${relative(root, out)} (${files.size} files, ${statSync(out).size} bytes)`);
