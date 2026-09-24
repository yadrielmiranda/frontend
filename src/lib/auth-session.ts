export const SESSION_RESET_EVENT = "auth:session-reset";
export const SESSION_CHANGE_STORAGE_KEY = "auth:session-change";

function clearAccountFilters() {
  try {
    const keys = Object.keys(window.sessionStorage);
    for (const key of keys) {
      if (key.startsWith("data-table:")) window.sessionStorage.removeItem(key);
    }
  } catch {
    // La navegación continúa aunque el navegador bloquee el almacenamiento.
  }
}

/** Descarta el árbol de React y la caché de rutas al cambiar de sesión. */
export function navigateAfterSessionChange(path: string, notifyOtherTabs = true) {
  window.dispatchEvent(new Event(SESSION_RESET_EVENT));
  clearAccountFilters();
  if (notifyOtherTabs) {
    try {
      // Solo se comparte una señal, nunca datos de la cuenta ni credenciales.
      window.localStorage.setItem(SESSION_CHANGE_STORAGE_KEY, crypto.randomUUID());
    } catch {
      // Los probes de sesión siguen detectando cambios si storage no está disponible.
    }
  }
  window.location.replace(path);
}
