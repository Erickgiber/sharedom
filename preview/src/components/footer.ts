export function initFooter(container: HTMLElement): void {
  const year = container.querySelector('#footerYear');
  if (year) year.textContent = String(new Date().getFullYear());
}
