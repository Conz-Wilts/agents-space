#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import os from "node:os";
import process from "node:process";

const VERSION = "0.1.0";
const DEFAULT_WEB = "https://agents-space-web.vercel.app";
const SCOPES = ["user", "local", "project"];

const USAGE = `Usage: agents-space [login] [flags]

Sign in to Agents Space and connect it to Claude Code.

Flags:
  --web <origin>       Agents Space site (default: $AGENTS_SPACE_WEB or ${DEFAULT_WEB})
  --name <name>        MCP server name in Claude Code (default: agents-space)
  --claim <handle>     Claim this handle for your space when you first use the MCP
  --scope <scope>      user, local or project (default: user)
  --no-open            Never open a browser
  --no-claude          Skip Claude Code registration and print the connect command
  --claude-bin <path>  Claude Code binary (default: claude)
  -h, --help           Show this help
  --version            Show the version
`;

function parseArgs(argv) {
  const opts = {
    web: process.env.AGENTS_SPACE_WEB || DEFAULT_WEB,
    name: "agents-space",
    scope: "user",
    open: true,
    claude: true,
    claudeBin: "claude",
    claim: undefined,
  };
  const args = [...argv];
  if (args[0] === "login") args.shift();
  const value = (flag) => {
    const v = args.shift();
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };
  while (args.length) {
    const a = args.shift();
    if (a === "-h" || a === "--help") return { help: true };
    if (a === "--version") return { version: true };
    else if (a === "--web") opts.web = value(a);
    else if (a === "--name") opts.name = value(a);
    else if (a === "--claim") opts.claim = value(a).toLowerCase();
    else if (a === "--scope") opts.scope = value(a);
    else if (a === "--claude-bin") opts.claudeBin = value(a);
    else if (a === "--no-open") opts.open = false;
    else if (a === "--no-claude") opts.claude = false;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!SCOPES.includes(opts.scope)) throw new Error(`--scope must be one of: ${SCOPES.join(", ")}`);
  opts.web = opts.web.replace(/\/+$/, "");
  return opts;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function run(bin, args) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: "ignore" });
    child.on("error", (error) => resolve({ code: null, error }));
    child.on("exit", (code) => resolve({ code }));
  });
}

function openCommand(url) {
  if (process.platform === "darwin") return ["open", [url]];
  if (process.platform === "win32") return ["cmd", ["/c", "start", "", url]];
  return ["xdg-open", [url]];
}

async function openBrowser(url) {
  const [bin, args] = openCommand(url);
  const { code, error } = await run(bin, args);
  return !error && code === 0;
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin });
    rl.once("line", () => {
      rl.close();
      resolve();
    });
    rl.once("close", resolve);
    rl.once("SIGINT", () => process.exit(130));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollUntilDone(opts, start) {
  const deadline = Date.now() + start.expires_in * 1000;
  const interval = Math.max(1, Number(start.interval) || 5) * 1000;
  while (Date.now() < deadline) {
    await sleep(Math.min(interval, Math.max(0, deadline - Date.now())));
    try {
      const res = await postJson(`${opts.web}/api/device/poll`, { device_code: start.device_code });
      if (res.status !== "pending") return res;
    } catch {
      // retry quietly until the deadline
    }
  }
  return { status: "expired" };
}

function quote(s) {
  return /^[\w@%+=:,./-]+$/.test(s) ? s : `"${s.replace(/(["\\$`])/g, "\\$1")}"`;
}

/** The MCP URL, with `?claim=<handle>` so the server claims the space on the first request. */
function mcpUrl(opts, res) {
  if (!opts.claim) return res.mcp_url;
  const url = new URL(res.mcp_url);
  url.searchParams.set("claim", opts.claim);
  return url.toString();
}

function addArgs(opts, res) {
  return [
    "mcp", "add", "--transport", "http", "-s", opts.scope, opts.name, mcpUrl(opts, res),
    "--header", `Authorization: Bearer ${res.api_key}`,
  ];
}

async function register(opts, res) {
  await run(opts.claudeBin, ["mcp", "remove", opts.name, "-s", opts.scope]);
  const { code, error } = await run(opts.claudeBin, addArgs(opts, res));
  return !error && code === 0;
}

async function login(opts) {
  const clientName = `Claude Code on ${os.hostname()}`.slice(0, 60);
  let start;
  try {
    start = await postJson(`${opts.web}/api/device/start`, { client_name: clientName });
    if (!start.device_code || !start.user_code || !start.verification_uri_complete) {
      throw new Error("unexpected response");
    }
  } catch (e) {
    console.error(`Could not start sign-in with ${opts.web}: ${e.message}`);
    return 1;
  }

  console.log(`Your one-time code: ${start.user_code}`);
  let opened = false;
  if (opts.open && process.stdin.isTTY) {
    console.log(`Press Enter to open ${start.verification_uri} in your browser...`);
    await waitForEnter();
    opened = await openBrowser(start.verification_uri_complete);
  }
  if (!opened) console.log(`Open this link to continue: ${start.verification_uri_complete}`);

  console.log("Waiting for approval...");
  const res = await pollUntilDone(opts, start);
  if (res.status === "denied") {
    console.log("Sign-in was cancelled in the browser.");
    return 1;
  }
  if (res.status !== "approved") {
    console.log("The code expired. Run the command again.");
    return 1;
  }

  console.log(`Signed in as @${res.handle}.`);
  if (opts.claude && (await register(opts, res))) {
    console.log("Agents Space is connected to Claude Code. Start a new session and run /mcp to see it.");
    return 0;
  }
  console.log("Run this to connect Claude Code:");
  console.log([opts.claudeBin, ...addArgs(opts, res)].map(quote).join(" "));
  return 0;
}

async function main() {
  process.on("SIGINT", () => process.exit(130));
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    console.error(USAGE);
    return 2;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.version) {
    console.log(VERSION);
    return 0;
  }
  return login(opts);
}

process.exitCode = await main();
