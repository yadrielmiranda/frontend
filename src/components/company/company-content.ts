// Titles, descriptions and structured data from the supplied About V7.
export type CompanyLocale = "en" | "es";
export type CompanyPageName = "company" | "for-ai" | "resources" | "prepare-your-quote" | "compare-impact-products";
export type CompanySearchParams = Record<string, string | string[] | undefined>;

const registrationParams = new Set(["ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"]);

export function companyRegistrationHref(locale: CompanyLocale, entries: Iterable<[string, string | string[] | undefined]>) {
  const query = new URLSearchParams({ lang: locale });
  for (const [name, value] of entries) {
    if (!registrationParams.has(name) || value === undefined) continue;
    if (Array.isArray(value)) value.forEach(item => query.append(name, item));
    else query.append(name, value);
  }
  return `/login/register?${query}`;
}

export function companyPath(page: CompanyPageName, locale: CompanyLocale): string {
  const section = page === "prepare-your-quote" || page === "compare-impact-products" ? `resources/${page}` : page;
  return `${locale === "es" ? "/es" : ""}/${section}`;
}

export const companyMetadata = {
  "company": {
    "en": {
      "title": "About Authentic Evolution Co. | Hurricane Impact Windows & Exterior Doors",
      "description": "Authentic Evolution Co. sells, distributes and installs exterior impact-resistant windows and doors for homeowners, contractors and dealers in South Florida. These products are designed for hurricane conditions and severe weather. Our professional platform connects estimates, orders and payments. We coordinate measurements, installation and permits with partner professionals when included in the project scope.",
      "canonical": "https://www.authenticevolutionco.com/company",
      "languages": {
        "en": "https://www.authenticevolutionco.com/company",
        "es": "https://www.authenticevolutionco.com/es/company",
        "x-default": "https://www.authenticevolutionco.com/company"
      },
      "organization": {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://www.authenticevolutionco.com/#organization",
        "name": "Authentic Evolution Co.",
        "url": "https://www.authenticevolutionco.com/company",
        "description": "Authentic Evolution Co. sells, distributes and installs exterior impact-resistant windows and doors for homeowners, contractors and dealers in South Florida. These products are designed for hurricane conditions and severe weather. Our professional platform connects estimates, orders and payments. We coordinate measurements, installation and permits with partner professionals when included in the project scope.",
        "telephone": "+1 (786) 999-4224",
        "email": "sales@authenticevolutionco.com",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "2320 Sabal Palm Dr",
          "addressLocality": "Miramar",
          "addressRegion": "FL",
          "postalCode": "33023",
          "addressCountry": "US"
        },
        "sameAs": [
          "https://www.instagram.com/authenticevolutionco/",
          "https://www.facebook.com/449194874949950"
        ]
      }
    },
    "es": {
      "title": "Conoce a Authentic Evolution Co. | Ventanas y puertas de impacto",
      "description": "Authentic Evolution Co. vende, distribuye e instala ventanas y puertas exteriores de impacto para propietarios, contratistas y distribuidores en el sur de Florida. Son productos diseñados para condiciones de huracán y clima severo. Nuestra plataforma profesional conecta cotizaciones, órdenes y pagos. Coordinamos mediciones, instalación y permisos con profesionales colaboradores cuando forman parte del alcance del proyecto.",
      "canonical": "https://www.authenticevolutionco.com/es/company",
      "languages": {
        "en": "https://www.authenticevolutionco.com/company",
        "es": "https://www.authenticevolutionco.com/es/company",
        "x-default": "https://www.authenticevolutionco.com/company"
      },
      "organization": {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://www.authenticevolutionco.com/#organization",
        "name": "Authentic Evolution Co.",
        "url": "https://www.authenticevolutionco.com/company",
        "description": "Authentic Evolution Co. sells, distributes and installs exterior impact-resistant windows and doors for homeowners, contractors and dealers in South Florida. These products are designed for hurricane conditions and severe weather. Our professional platform connects estimates, orders and payments. We coordinate measurements, installation and permits with partner professionals when included in the project scope.",
        "telephone": "+1 (786) 999-4224",
        "email": "sales@authenticevolutionco.com",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "2320 Sabal Palm Dr",
          "addressLocality": "Miramar",
          "addressRegion": "FL",
          "postalCode": "33023",
          "addressCountry": "US"
        },
        "sameAs": [
          "https://www.instagram.com/authenticevolutionco/",
          "https://www.facebook.com/449194874949950"
        ]
      }
    }
  },
  "for-ai": {
    "en": {
      "title": "AI reference | Authentic Evolution",
      "description": "Public company facts, how the platform works, and where to check information before citing it.",
      "canonical": "https://www.authenticevolutionco.com/for-ai",
      "languages": {
        "en": "https://www.authenticevolutionco.com/for-ai",
        "es": "https://www.authenticevolutionco.com/es/for-ai",
        "x-default": "https://www.authenticevolutionco.com/for-ai"
      }
    },
    "es": {
      "title": "Referencia para IA | Authentic Evolution",
      "description": "Datos públicos de la empresa, cómo funciona la plataforma y dónde verificar la información antes de citarla.",
      "canonical": "https://www.authenticevolutionco.com/es/for-ai",
      "languages": {
        "en": "https://www.authenticevolutionco.com/for-ai",
        "es": "https://www.authenticevolutionco.com/es/for-ai",
        "x-default": "https://www.authenticevolutionco.com/for-ai"
      }
    }
  },
  "resources": {
    "en": {
      "title": "Practical guides for impact windows and doors | Authentic Evolution",
      "description": "Use these guides to prepare better project information and compare options on equal terms before ordering.",
      "canonical": "https://www.authenticevolutionco.com/resources",
      "languages": {
        "en": "https://www.authenticevolutionco.com/resources",
        "es": "https://www.authenticevolutionco.com/es/resources",
        "x-default": "https://www.authenticevolutionco.com/resources"
      }
    },
    "es": {
      "title": "Guías prácticas de ventanas y puertas de impacto | Authentic Evolution",
      "description": "Usa estas guías para preparar los datos de tu proyecto y comparar opciones en igualdad de condiciones antes de ordenar.",
      "canonical": "https://www.authenticevolutionco.com/es/resources",
      "languages": {
        "en": "https://www.authenticevolutionco.com/resources",
        "es": "https://www.authenticevolutionco.com/es/resources",
        "x-default": "https://www.authenticevolutionco.com/resources"
      }
    }
  },
  "prepare-your-quote": {
    "en": {
      "title": "How to prepare a quote for impact windows and doors | Authentic Evolution",
      "description": "Start with a list of openings, approximate dimensions and photos. A clear scope helps the sales team build a more useful estimate and shows which details still need confirmation before you order.",
      "canonical": "https://www.authenticevolutionco.com/resources/prepare-your-quote",
      "languages": {
        "en": "https://www.authenticevolutionco.com/resources/prepare-your-quote",
        "es": "https://www.authenticevolutionco.com/es/resources/prepare-your-quote",
        "x-default": "https://www.authenticevolutionco.com/resources/prepare-your-quote"
      }
    },
    "es": {
      "title": "Cómo preparar una cotización de ventanas y puertas de impacto | Authentic Evolution",
      "description": "Empieza con una lista de las aberturas, medidas aproximadas y fotos. Un alcance claro ayuda al equipo comercial a preparar una cotización más útil y a identificar qué datos quedan por confirmar antes de realizar la orden.",
      "canonical": "https://www.authenticevolutionco.com/es/resources/prepare-your-quote",
      "languages": {
        "en": "https://www.authenticevolutionco.com/resources/prepare-your-quote",
        "es": "https://www.authenticevolutionco.com/es/resources/prepare-your-quote",
        "x-default": "https://www.authenticevolutionco.com/resources/prepare-your-quote"
      }
    }
  },
  "compare-impact-products": {
    "en": {
      "title": "How to compare impact products and check the documentation | Authentic Evolution",
      "description": "Compare windows and doors by manufacturer, series and configuration, not by appearance or price alone. Use the applicable documents to check that the quoted unit matches the project requirements.",
      "canonical": "https://www.authenticevolutionco.com/resources/compare-impact-products",
      "languages": {
        "en": "https://www.authenticevolutionco.com/resources/compare-impact-products",
        "es": "https://www.authenticevolutionco.com/es/resources/compare-impact-products",
        "x-default": "https://www.authenticevolutionco.com/resources/compare-impact-products"
      }
    },
    "es": {
      "title": "Cómo comparar productos de impacto y revisar su documentación | Authentic Evolution",
      "description": "Compara ventanas y puertas por fabricante, serie y configuración, no solo por apariencia o precio. Usa la documentación aplicable para comprobar que la unidad cotizada corresponda a las necesidades del proyecto.",
      "canonical": "https://www.authenticevolutionco.com/es/resources/compare-impact-products",
      "languages": {
        "en": "https://www.authenticevolutionco.com/resources/compare-impact-products",
        "es": "https://www.authenticevolutionco.com/es/resources/compare-impact-products",
        "x-default": "https://www.authenticevolutionco.com/resources/compare-impact-products"
      }
    }
  }
} as const;
