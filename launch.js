/* Visual de abertura; a calculadora mantém-se pronta em segundo plano. */
document.addEventListener('DOMContentLoaded', () => {
  const launchScreen = document.getElementById('launch-screen');
  if (!launchScreen) return;

  window.setTimeout(() => {
    launchScreen.classList.add('is-exiting');
    window.setTimeout(() => launchScreen.remove(), 350);
  }, 2200);
});
