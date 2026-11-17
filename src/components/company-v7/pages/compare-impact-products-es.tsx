import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function CompareImpactProductsEsContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"Cómo comparar productos de impacto y revisar su documentación"}
          </h1>
          <p className="lead">
            {"Compara ventanas y puertas por fabricante, serie y configuración, no solo por apariencia o precio. Usa la documentación aplicable para comprobar que la unidad cotizada corresponda a las necesidades del proyecto."}
          </p>
        </div>
      </header>
      <section className="section" id="step-1">
        <div className="wrap">
          <h2>
            {"Compara productos y alcances equivalentes"}
          </h2>
          <p>
            {"Anota el fabricante, la serie, la configuración, las medidas, el vidrio y el acabado del marco de cada opción. Compara por separado las cantidades y los cargos por entrega, instalación, coordinación de permisos u otros conceptos. Un total menor no siempre representa un mejor precio si cubre un producto distinto o menos servicios."}
          </p>
        </div>
      </section>
      <section className="section" id="step-2">
        <div className="wrap">
          <h2>
            {"Pide los documentos que correspondan a tu unidad"}
          </h2>
          <p>
            {"Solicita la documentación vigente del producto y de instalación del fabricante, junto con la aprobación aplicable. Comprueba que el fabricante, la serie y la revisión coincidan con las referencias de la cotización. Confirma que los planos y tablas contemplen las medidas, la configuración y el vidrio propuestos. Un documento de un producto similar no demuestra que aplique al tuyo."}
          </p>
        </div>
      </section>
      <section className="section" id="step-3">
        <div className="wrap">
          <h2>
            {"Confirma los detalles del proyecto"}
          </h2>
          <p>
            {"Pídele al profesional calificado a cargo del trabajo que confirme qué aprobación y detalles de instalación corresponden a esa abertura y a ese sitio. Resuelve cualquier diferencia entre la cotización y la documentación antes de hacer el pedido. Conserva juntos la cotización final y los documentos correspondientes para que todos consulten la misma versión."}
          </p>
        </div>
      </section>
      <section className="section" id="contact">
        <div className="wrap">
          <Link href="/login/register" className="button">
            {"Crea tu cuenta GRATIS"}
          </Link>
          <div className="actions">
            <a href="mailto:sales@authenticevolutionco.com">
              {"Pide ayuda para preparar una cotización"}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
