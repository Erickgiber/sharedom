export function showToast(message: string, durationMs = 2200): void {
  let toastEl = document.getElementById('toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add('show');

  setTimeout(() => {
    toastEl?.classList.remove('show');
  }, durationMs);
}
