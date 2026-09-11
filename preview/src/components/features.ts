export function initFeatures(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.feature-card').forEach((card) => {
    function handleMouseMove(e: MouseEvent): void {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const deltaX = (x - centerX) / centerX;
      const deltaY = (y - centerY) / centerY;

      const maxTilt = 10;
      const rotateY = (deltaX * maxTilt).toFixed(2);
      const rotateX = (-deltaY * maxTilt).toFixed(2);

      card.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
      card.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    }

    function handleMouseEnter(): void {
      card.style.transition = 'transform 0.08s ease-out, border-color 0.3s ease, box-shadow 0.3s ease';
    }

    function handleMouseLeave(): void {
      card.style.transition =
        'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease';
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
    }

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
  });
}
