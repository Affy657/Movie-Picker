/**
 * One-shot: create/update MONGODB_URI + TMDB_API_KEY in GCP Secret Manager from repo root .env
 * Usage: node scripts/sync-gcp-secrets-from-env.mjs [PROJECT_ID]
 * Does not print secret values.
 */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Windows: use shell so PATH resolves gcloud.cmd from Cloud SDK */
const spawnOpts = { encoding: "utf8", shell: process.platform === "win32" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const proj = process.argv[2] || "movie-picker-2026";
const envPath = join(root, ".env");
const keys = ["MONGODB_URI", "TMDB_API_KEY"];

const env = readFileSync(envPath, "utf8");
const map = {};
for (const line of env.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  map[k] = v;
}

const tmp = join(root, ".tmp-gcp-secret");
for (const k of keys) {
  if (!map[k]) {
    console.error(`Missing ${k} in .env`);
    process.exit(1);
  }
  writeFileSync(tmp, map[k]);
  let r = spawnSync(
    "gcloud",
    [
      "secrets",
      "create",
      k,
      "--data-file",
      tmp,
      "--project",
      proj,
      "--replication-policy",
      "automatic",
    ],
    spawnOpts,
  );
  if (
    r.status !== 0 &&
    r.stderr &&
    !String(r.stderr).includes("already exists")
  ) {
    console.error("create stderr:", r.stderr.slice(0, 500));
  }
  if (r.status !== 0) {
    r = spawnSync(
      "gcloud",
      ["secrets", "versions", "add", k, "--data-file", tmp, "--project", proj],
      spawnOpts,
    );
    if (r.status !== 0) {
      console.error("versions add failed:", r.stderr || r.stdout || r.error);
      process.exit(1);
    }
    console.log("updated version:", k);
  } else {
    console.log("created:", k);
  }
}
try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}
