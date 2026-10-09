// Packaged builds: launch with CRATESMOVE_DEBUG=1 to enable
const enabled = import.meta.env.DEV || process.env.CRATESMOVE_DEBUG === '1';

export function debugLog(scope: string, ...args: unknown[]) {
  if (enabled) {
    console.log(`[${new Date().toISOString()}] [${scope}]`, ...args);
  }
}
