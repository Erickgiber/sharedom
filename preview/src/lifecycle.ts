type Cleanup = () => void;

let cleanups: Cleanup[] = [];

export function onCleanup(fn: Cleanup): void {
  cleanups.push(fn);
}

export function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void;
export function listen<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions
): void;
export function listen(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions
): void {
  target.addEventListener(type, handler, options);
  onCleanup(() => target.removeEventListener(type, handler, options));
}

export function observe(observer: { disconnect(): void }): void {
  onCleanup(() => observer.disconnect());
}

export function runCleanups(): void {
  const pending = cleanups;
  cleanups = [];
  pending.forEach((fn) => fn());
}
