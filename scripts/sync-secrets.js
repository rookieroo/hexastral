#!/usr/bin/env node
/**
 * Unified Cloudflare Secrets Sync Script for ZHOP Monorepo
 *
 * Usage:
 *   bun scripts/sync-secrets.js --app=web --env=production
 *   bun scripts/sync-secrets.js --app=cdn --env=production --dry-run
 *   bun scripts/sync-secrets.js --app=all --env=production
 *
 * Features:
 * - Sync secrets from .env.{env}.secrets to Cloudflare Workers/Pages
 * - Support multiple apps (web, cdn, dispatcher, deploy)
 * - Dry-run mode for testing
 * - Bulk upload for efficiency
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// App configurations
const APP_CONFIGS = {
  // ============ HexAstral — Apps ============
  "hexastral-api": {
    name: "hexastral-api",
    path: "apps/hexastral-api",
    type: "worker",
    description: "Main API (api.hexastral.com)",
  },

  // ============ HexAstral — Services (Internal Microservices) ============
  "svc-astro": {
    name: "svc-astro",
    path: "services/svc-astro",
    type: "worker",
    description: "Astrology computation + AI interpretation (Gemini/DeepSeek)",
  },
  "svc-fortune": {
    name: "svc-fortune",
    path: "services/svc-fortune",
    type: "worker",
    description: "Daily fortune generation for push notifications",
  },
  "svc-geocode": {
    name: "hexastral-svc-geocode",
    path: "services/svc-geocode",
    type: "worker",
    description: "City/timezone lookup via Nominatim (no secrets required)",
  },
  "svc-mailer": {
    name: "hexastral-svc-mailer",
    path: "services/svc-mailer",
    type: "worker",
    description: "Transactional email via AWS SES",
  },
  "svc-notify": {
    name: "svc-notify",
    path: "services/svc-notify",
    type: "worker",
    description: "Push notification delivery (Expo FCM + alerting channels)",
  },
  "svc-admin-notify": {
    name: "svc-admin-notify",
    path: "services/svc-admin-notify",
    type: "worker",
    description: "Admin alert notifications (Telegram)",
  },
  "svc-ad-convert": {
    name: "svc-ad-convert",
    path: "services/svc-ad-convert",
    type: "worker",
    description: "Merchant ad conversion postbacks (Meta/Google/TikTok/Reddit)",
  },

  "svc-tail": {
    name: "svc-tail",
    path: "services/svc-tail",
    type: "worker",
    description: "Log tail aggregator (no secrets required)",
  },
  "core-workflow": {
    name: "core-workflow",
    path: "services/core-workflow",
    type: "worker",
    description: "Cloudflare Workflows engine (no secrets required)",
  },
  "svc-signal": {
    name: "svc-signal",
    path: "services/svc-signal",
    type: "worker",
    description: "Signal processing service",
  },
  "svc-feng": {
    name: "svc-feng",
    path: "services/svc-feng",
    type: "worker",
    description: "Feng-shui analysis orchestration worker",
  },
};

// Named groups — use with --app=<group>
const APP_GROUPS = {
  // All HexAstral workers that have actual secrets to sync
  hexastral: [
    "hexastral-api",
    "svc-astro",
    "svc-fortune",
    "svc-mailer",
    "svc-notify",
    "svc-admin-notify",
    "svc-ad-convert",
    "svc-signal",
  ],
  // All workers including those with no secrets (will be skipped gracefully)
  "hexastral-all": [
    "hexastral-api",
    "svc-astro",
    "svc-fortune",
    "svc-geocode",
    "svc-mailer",
    "svc-notify",
    "svc-admin-notify",
    "svc-ad-convert",
    "svc-tail",
    "svc-signal",
  ],
};

class SecretsSync {
  constructor() {
    this.parseArgs();
    this.validateArgs();
  }

  parseArgs() {
    this.args = {
      app: this.getArg("--app"),
      env: this.getArg("--env", "production"),
      dryRun: this.hasFlag("--dry-run"),
      skipBackup: this.hasFlag("--skip-backup"),
      verbose: this.hasFlag("--verbose"),
      help: this.hasFlag("--help"),
    };
  }

  getArg(name, defaultValue = null) {
    const arg = process.argv.find((a) => a.startsWith(`${name}=`));
    return arg ? arg.split("=")[1] : defaultValue;
  }

  hasFlag(name) {
    return process.argv.includes(name);
  }

  validateArgs() {
    if (this.args.help) {
      this.showHelp();
      process.exit(0);
    }

    if (!this.args.app) {
      console.error("❌ Error: --app parameter is required");
      this.showHelp();
      process.exit(1);
    }

    const validTargets = [
      "all",
      ...Object.keys(APP_CONFIGS),
      ...Object.keys(APP_GROUPS),
    ];
    if (!validTargets.includes(this.args.app)) {
      console.error(`❌ Error: Unknown app "${this.args.app}"`);
      console.error(
        `Available apps: ${Object.keys(APP_CONFIGS).join(", ")}`
      );
      console.error(
        `Available groups: ${Object.keys(APP_GROUPS).join(", ")}, all`
      );
      process.exit(1);
    }
  }

  showHelp() {
    const appList = Object.entries(APP_CONFIGS)
      .map(([k, v]) => `    ${k.padEnd(20)} ${v.description}`)
      .join("\n");
    const groupList = Object.entries(APP_GROUPS)
      .map(([k, v]) => `    ${k.padEnd(20)} ${v.join(", ")}`)
      .join("\n");
    console.log(`
🔐 Cloudflare Secrets Sync — HexAstral Monorepo

Usage:
  bun scripts/sync-secrets.js --app=<app-name|group|all> [options]

Options:
  --app=<name>      App name, group name, or "all" (required)
  --env=<env>       Environment (default: production)
  --dry-run         Show what would be done without making changes
  --verbose         Show detailed logs
  --help            Show this help message

Apps:
${appList}

Groups (shortcuts for multiple apps):
${groupList}
    all                  Every app in APP_CONFIGS

Secrets file convention:
  <app-path>/.env.production.secrets   (KEY=VALUE, one per line, no quotes)
  Apps with no secrets are skipped gracefully.

Examples:
  # Sync all HexAstral workers that have secrets
  bun scripts/sync-secrets.js --app=hexastral --env=production

  # Dry run for a single service
  bun scripts/sync-secrets.js --app=svc-notify --env=production --dry-run

  # Sync the main API
  bun scripts/sync-secrets.js --app=hexastral-api --env=production
`);
  }

  loadSecrets(appConfig) {
    const secretsFile = path.join(
      ROOT_DIR,
      appConfig.path,
      `.env.${this.args.env}.secrets`
    );

    if (!fs.existsSync(secretsFile)) {
      console.warn(`⚠️  Secrets file not found: ${secretsFile}`);
      return null;
    }

    if (this.args.verbose) {
      console.log(`📄 Loading secrets from: ${secretsFile}`);
    }

    const content = fs.readFileSync(secretsFile, "utf-8");
    const secrets = {};

    content.split("\n").forEach((line) => {
      line = line.trim();

      // Skip comments and empty lines
      if (!line || line.startsWith("#") || line.startsWith("//")) {
        return;
      }

      // Parse KEY=VALUE (handle values with = in them)
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove surrounding quotes if present
        secrets[key] = value.replace(/^["']|["']$/g, "");
      }
    });

    return secrets;
  }

  async syncSecretsToCloudflare(appConfig, secrets) {
    if (!secrets || Object.keys(secrets).length === 0) {
      console.log(`⏭️  No secrets to sync for ${appConfig.name}`);
      return;
    }

    console.log(
      `\n🔄 Syncing ${Object.keys(secrets).length} secrets to ${appConfig.name}...`
    );

    if (this.args.verbose) {
      console.log(`Secret keys: ${Object.keys(secrets).join(", ")}`);
    }

    // Create temporary secrets.json file
    const tempFile = path.join(ROOT_DIR, appConfig.path, "secrets.json");

    try {
      // Write secrets to temporary file
      fs.writeFileSync(tempFile, JSON.stringify(secrets, null, 2));

      if (this.args.dryRun) {
        console.log(
          `[DRY RUN] Would execute: wrangler secret bulk secrets.json --name=${appConfig.name}`
        );
        console.log(`Secrets to upload:`);
        Object.keys(secrets).forEach((key) => {
          console.log(`  - ${key}`);
        });
        return;
      }

      // Upload secrets to Cloudflare
      const command =
        appConfig.type === "pages"
          ? `wrangler pages secret bulk secrets.json --project-name=${appConfig.name}`
          : `wrangler secret bulk secrets.json --name=${appConfig.name}`;

      if (this.args.verbose) {
        console.log(`Executing: ${command}`);
      }

      execSync(command, {
        cwd: path.join(ROOT_DIR, appConfig.path),
        stdio: "inherit",
      });

      console.log(`✅ Successfully synced secrets to ${appConfig.name}`);
    } catch (error) {
      console.error(
        `❌ Error syncing secrets to ${appConfig.name}:`,
        error.message
      );
      throw error;
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async syncApp(appName) {
    const appConfig = APP_CONFIGS[appName];

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📦 App: ${appName} (${appConfig.description})`);
    console.log(`🏷️  Worker Name: ${appConfig.name}`);
    console.log(`📁 Path: ${appConfig.path}`);
    console.log(`🌍 Environment: ${this.args.env}`);
    console.log(`${"=".repeat(60)}`);

    // Load secrets
    const secrets = this.loadSecrets(appConfig);

    if (!secrets) {
      console.log(`⏭️  Skipping ${appName} (no secrets file)`);
      return { app: appName, status: "skipped", reason: "no secrets file" };
    }

    // Sync to Cloudflare
    try {
      await this.syncSecretsToCloudflare(appConfig, secrets);
      return {
        app: appName,
        status: "success",
        count: Object.keys(secrets).length,
      };
    } catch (error) {
      return { app: appName, status: "error", error: error.message };
    }
  }

  async sync() {
    console.log("\n🚀 Starting Cloudflare Secrets Sync");
    console.log(`Mode: ${this.args.dryRun ? "🧪 DRY RUN" : "✨ LIVE"}`);

    const startTime = Date.now();
    const results = [];

    // Resolve target app names
    let appNames;
    if (this.args.app === "all") {
      appNames = Object.keys(APP_CONFIGS);
    } else if (APP_GROUPS[this.args.app]) {
      appNames = APP_GROUPS[this.args.app];
    } else {
      appNames = [this.args.app];
    }

    try {
      for (const appName of appNames) {
        const result = await this.syncApp(appName);
        results.push(result);
      }

      // Summary
      console.log("\n" + "=".repeat(60));
      console.log("📊 Sync Summary");
      console.log("=".repeat(60));

      const successful = results.filter((r) => r.status === "success");
      const failed = results.filter((r) => r.status === "error");
      const skipped = results.filter((r) => r.status === "skipped");

      if (successful.length > 0) {
        console.log(`\n✅ Success (${successful.length}):`);
        successful.forEach((r) => {
          console.log(`   - ${r.app}: ${r.count} secrets synced`);
        });
      }

      if (skipped.length > 0) {
        console.log(`\n⏭️  Skipped (${skipped.length}):`);
        skipped.forEach((r) => {
          console.log(`   - ${r.app}: ${r.reason}`);
        });
      }

      if (failed.length > 0) {
        console.log(`\n❌ Failed (${failed.length}):`);
        failed.forEach((r) => {
          console.log(`   - ${r.app}: ${r.error}`);
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n⏱️  Total time: ${duration}s`);

      if (failed.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error("\n❌ Sync failed:", error.message);
      process.exit(1);
    }
  }
}

// Run
const sync = new SecretsSync();
sync.sync().catch(console.error);
