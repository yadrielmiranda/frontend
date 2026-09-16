"use client";

import { useCallback, useLayoutEffect, type RefObject } from "react";

function navigationBottom(): number {
  return Math.max(
    0,
    document.querySelector<HTMLElement>("[data-app-header]")?.getBoundingClientRect().bottom ?? 0,
  );
}

export function usePageTableScroll(
  enabled: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    const table = container?.querySelector("table");
    const header = table?.tHead;
    if (!enabled || !container || !table || !header) return;

    let frame: number | null = null;
    let lastOffset = -1;
    const originalTransform = header.style.transform;

    const update = () => {
      frame = null;
      const bounds = table.getBoundingClientRect();
      const headerBounds = header.getBoundingClientRect();
      const headerHeight = headerBounds.height;
      const origin = headerBounds.top - Math.max(0, lastOffset);
      const top = navigationBottom();
      const available = Math.max(0, bounds.bottom - origin - headerHeight);
      // Una cabecera muy alta no debe cubrir toda la pantalla al ampliar el zoom.
      const canPin = window.innerHeight > top + headerHeight + 48;
      const offset = canPin ? Math.min(available, Math.max(0, top - origin)) : 0;

      if (offset !== lastOffset) {
        header.style.transform = offset > 0 ? `translateY(${offset}px)` : originalTransform;
        lastOffset = offset;
      }
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    // overflow-x crea un contenedor de scroll que impide usar sticky respecto
    // a la página. Desplazamos la misma cabecera, sin duplicar filtros ni columnas.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(table);
    observer.observe(header);
    const navigation = document.querySelector<HTMLElement>("[data-app-header]");
    if (navigation) observer.observe(navigation);
    const main = container.closest("main");
    if (main) observer.observe(main);
    update();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      header.style.transform = originalTransform;
    };
  }, [containerRef, enabled]);

  return useCallback(() => {
    if (!enabled || !containerRef.current) return;
    const distance = containerRef.current.getBoundingClientRect().top - navigationBottom();
    // Al cambiar de página, vuelve a las primeras filas sin saltos al montar
    // la vista o restaurar filtros guardados.
    if (distance < 0) {
      window.scrollBy({ top: distance, behavior: "instant" });
    }
  }, [containerRef, enabled]);
}
