export function trackPointerGlow(element: HTMLElement | null): void {
  if (!element) return;

  element.addEventListener('mousemove', (event) => {
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--ctrl-mouse-x', `${event.clientX - rect.left}px`);
    element.style.setProperty('--ctrl-mouse-y', `${event.clientY - rect.top}px`);
  });
}
