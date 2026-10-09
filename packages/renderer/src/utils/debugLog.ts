const enabled = import.meta.env.DEV;

export function debugLog(scope: string, ...args: unknown[]) {
  if (enabled) {
    console.log(`[${new Date().toISOString()}] [${scope}]`, ...args);
  }
}
