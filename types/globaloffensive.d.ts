declare module 'globaloffensive' {
  import type SteamUser from 'steam-user';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EventListener = (...args: any[]) => void;

  export default class GlobalOffensive {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inventory: any[] | null;
    constructor(steamUser: SteamUser);
    addToCasket(casketId: string, itemId: string): void;
    removeFromCasket(casketId: string, itemId: string): void;
    getCasketContents(
      casketId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (err: Error | null, items: any[]) => void,
    ): void;
    nameItem(toolId: number, targetId: string, name: string): void;
    on(event: string, listener: EventListener): this;
    once(event: string, listener: EventListener): this;
  }
}
