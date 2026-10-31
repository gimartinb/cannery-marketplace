// Runs the site locally without a Cloudflare login.
// Workers AI only runs on Cloudflare's network, so `wrangler dev` asks you to
// sign in when the AI binding is present. This copies wrangler.jsonc without
// the AI binding to .wrangler-local.jsonc (ignored by Git) and starts the
// local server with it. Everything works except the AI writing help, which
// shows a friendly "not set up" message.
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const config = readFileSync("wrangler.jsonc", "utf8").replace(/"ai":\s*\{\s*"binding":\s*"AI"\s*\},?/, "");
writeFileSync(".wrangler-local.jsonc", config);
const child = spawn("npx", ["wrangler", "dev", "-c", ".wrangler-local.jsonc", ...process.argv.slice(2)], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
