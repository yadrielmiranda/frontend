"use client";

import { useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CompanyLocale } from "./company-content";

const galleries = {
  windows: {
    label: { en: "Impact window photos", es: "Fotos de ventanas de impacto" },
    photos: [
      { en: "A wide dark-framed window on a white exterior wall", es: "Ventana ancha de marco oscuro en una pared exterior blanca" },
      { en: "Dark-framed front window above a planting bed", es: "Ventana de marco oscuro sobre un jardín al pie de la fachada" },
      { en: "Three dark-framed windows across the front of a single-story home", es: "Tres ventanas de marco oscuro en la fachada de una casa de una planta" },
    ],
  },
  sliding: {
    label: { en: "Sliding glass door photos", es: "Fotos de puertas corredizas de vidrio" },
    photos: [
      { en: "Glass patio doors facing the pool", es: "Puertas de vidrio del patio frente a la piscina" },
      { en: "A side view of the glass doors along the patio", es: "Vista lateral de las puertas de vidrio a lo largo del patio" },
      { en: "Poolside view of the glass doors across the back of the house", es: "Vista desde la piscina de las puertas de vidrio en la parte trasera de la casa" },
    ],
  },
  entry: {
    label: { en: "French and entry door photos", es: "Fotos de puertas francesas y de entrada" },
    photos: [
      { en: "Front door with a geometric glass design", es: "Puerta de entrada con diseño geométrico de vidrio" },
      { en: "Double glass doors opening onto a covered patio", es: "Puertas dobles de vidrio que dan a una terraza cubierta" },
      { en: "Dark-framed glass front door between two windows", es: "Puerta de entrada de vidrio con marco oscuro entre dos ventanas" },
    ],
  },
};

export function CompanyProductGallery({ category, locale }: { category: keyof typeof galleries; locale: CompanyLocale }) {
  const { photos, label } = galleries[category];
  const track = useRef<HTMLUListElement>(null);
  const trackId = useId();
  const [current, setCurrent] = useState(0);
  const spanish = locale === "es";

  function move(direction: number) {
    const list = track.current;
    if (!list || !list.clientWidth) return;
    const index = Math.round(list.scrollLeft / list.clientWidth);
    const next = (index + direction + photos.length) % photos.length;
    list.scrollTo({ left: next * list.clientWidth, behavior: "instant" });
  }

  return (
    <section className="company-product-gallery" aria-label={label[locale]}>
      <ul id={trackId} ref={track} tabIndex={0}
        onScroll={event => {
          const list = event.currentTarget;
          if (list.clientWidth) setCurrent(Math.max(0, Math.min(photos.length - 1, Math.round(list.scrollLeft / list.clientWidth))));
        }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {photos.map((photo, index) => (
          <li key={index}>
            {/* eslint-disable-next-line @next/next/no-img-element -- These locally resized WebPs are ready to serve. */}
            <img src={`/company/gallery/${category}-${index + 1}.webp`} alt={photo[locale]} width={1080} height={642} loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>
      <div className="gallery-controls">
        <button type="button" aria-controls={trackId} aria-label={spanish ? "Foto anterior" : "Previous photo"} onClick={() => move(-1)}>
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <span aria-live="polite" aria-atomic="true">{current + 1} / {photos.length}</span>
        <button type="button" aria-controls={trackId} aria-label={spanish ? "Foto siguiente" : "Next photo"} onClick={() => move(1)}>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
