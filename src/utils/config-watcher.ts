/**
 * Hot-reload watcher for `~/.arcane/config.json`.
 *
 * When the config file changes we reload it and apply any changes to the
 * tool filter via `ToolRegistry.diffAndApply()`. The SDK auto-emits
 * `notifications/tools/list_changed` on enable/disable, so connected
 * clients refresh `tools/list` on their own.
 *
 * Falls back gracefully: if the config file does not exist or `fs.watch`
 * throws (some filesystems don't support it), we flip
 * `registry.hotReloadAvailable = false` and log once. The slash command
 * consults that flag to decide between "✓ refreshed" and "please reconnect".
 */

import { existsSync, watch, type FSWatcher } from "fs";
import { CONFIG_FILE_PATH, reloadConfig } from "../config.js";
import type { ToolRegistry } from "../tools/registry.js";
import { logger } from "./logger.js";

const DEBOUNCE_MS = 250;

export interface ConfigWatcherHandle {
  stop(): void;
}

export function startConfigWatcher(registry: ToolRegistry): ConfigWatcherHandle {
  if (!existsSync(CONFIG_FILE_PATH)) {
    logger.info(
      `Config file not found at ${CONFIG_FILE_PATH} — hot reload of tool filter disabled. ` +
      `Create the file and restart to enable hot reload.`,
    );
    registry.hotReloadAvailable = false;
    return { stop: () => {} };
  }

  let timer: NodeJS.Timeout | null = null;
  let watcher: FSWatcher | null = null;

  const handleChange = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        const newConfig = reloadConfig();
        const { turnedOn, turnedOff } = registry.diffAndApply(newConfig.tools);
        if (turnedOn.length === 0 && turnedOff.length === 0) {
          logger.debug("Config changed but resolved tool set is unchanged");
          return;
        }
        logger.info(
          `Tool filter refreshed: +${turnedOn.length} enabled, -${turnedOff.length} disabled`,
        );
      } catch (err) {
        // Parse errors, missing file, etc. — keep current set live.
        logger.error(
          `Failed to reload config from ${CONFIG_FILE_PATH}; keeping current tool filter live`,
          err,
        );
      }
    }, DEBOUNCE_MS);
  };

  try {
    watcher = watch(CONFIG_FILE_PATH, { persistent: false }, (eventType) => {
      // Both "change" and "rename" (some editors save via rename) trigger reload.
      if (eventType === "change" || eventType === "rename") {
        handleChange();
      }
    });
    registry.hotReloadAvailable = true;
    logger.info(`Watching ${CONFIG_FILE_PATH} for tool-filter changes (debounced ${DEBOUNCE_MS}ms)`);
  } catch (err) {
    registry.hotReloadAvailable = false;
    logger.warn(
      `Could not attach fs.watch to ${CONFIG_FILE_PATH}; hot reload disabled. ` +
      `Changes to tool filter will require a reconnect.`,
      err,
    );
    return { stop: () => {} };
  }

  return {
    stop() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      watcher?.close();
      watcher = null;
    },
  };
}
