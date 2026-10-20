declare global {
  interface Window { duneDesktop?: { quit(): void } }
}
export const desktopQuit = (): void => { window.duneDesktop?.quit(); };
