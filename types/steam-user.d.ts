declare module 'steam-user' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EventListener = (...args: any[]) => void;

  export default class SteamUser {
    steamID: {toString(): string} | null;
    logOn(options: {refreshToken: string}): void;
    logOff(): void;
    gamesPlayed(appids: number[], force?: boolean): void;
    getPersonas(steamids: unknown[]): void;
    on(event: string, listener: EventListener): this;
    once(event: string, listener: EventListener): this;
  }
}
