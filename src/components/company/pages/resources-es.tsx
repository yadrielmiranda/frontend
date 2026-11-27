import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function ResourcesEsContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"Guías prácticas de ventanas y puertas de impacto"}
          </h1>
          <p className="lead">
            {"Usa estas guías para preparar los datos de tu proyecto y comparar opciones en igualdad de condiciones antes de ordenar."}
          </p>
        </div>
      </header>
      <section className="section" id="guides">
        <div className="wrap">
          <ul className="text-list">
            <li>
              <h2>
                <Link href="/es/resources/prepare-your-quote">
                  {"Cómo preparar una cotización de ventanas y puertas de impacto"}
                </Link>
              </h2>
              <p>
                {"Empieza con una lista de las aberturas, medidas aproximadas y fotos. Un alcance claro ayuda al equipo comercial a preparar una cotización más útil y a identificar qué datos quedan por confirmar antes de realizar la orden."}
              </p>
            </li>
            <li>
              <h2>
                <Link href="/es/resources/compare-impact-products">
                  {"Cómo comparar productos de impacto y revisar su documentación"}
                </Link>
              </h2>
              <p>
                {"Compara ventanas y puertas por fabricante, serie y configuración, no solo por apariencia o precio. Usa la documentación aplicable para comprobar que la unidad cotizada corresponda a las necesidades del proyecto."}
              </p>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
