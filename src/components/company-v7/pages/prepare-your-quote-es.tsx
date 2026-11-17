import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function PrepareYourQuoteEsContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"Cómo preparar una cotización de ventanas y puertas de impacto"}
          </h1>
          <p className="lead">
            {"Empieza con una lista de las aberturas, medidas aproximadas y fotos. Un alcance claro ayuda al equipo comercial a preparar una cotización más útil y a identificar qué datos quedan por confirmar antes de hacer el pedido."}
          </p>
        </div>
      </header>
      <section className="section" id="step-1">
        <div className="wrap">
          <h2>
            {"Identifica cada abertura"}
          </h2>
          <p>
            {"Asigna un nombre a cada abertura, como Cocina 01 o Patio 02, y anota cuántas unidades necesitas. Indica el ancho y el alto aproximados con sus unidades y aclara si mediste el vano, el marco existente u otra referencia. Si es posible, toma una foto desde el interior y otra desde el exterior. Estas medidas sirven para la cotización inicial, no para fabricar."}
          </p>
        </div>
      </section>
      <section className="section" id="step-2">
        <div className="wrap">
          <h2>
            {"Explica cómo quieres usar cada unidad"}
          </h2>
          <p>
            {"Para las ventanas, indica cuáles deben ser fijas y cuáles deben abrirse, y en qué sentido. Para las puertas, señala el sentido de apertura o los paneles que deben moverse. Anota tus preferencias de vidrio, privacidad y acabado del marco. Si todavía no has decidido algo, déjalo indicado para consultarlo."}
          </p>
        </div>
      </section>
      <section className="section" id="step-3">
        <div className="wrap">
          <h2>
            {"Distingue los materiales de los servicios"}
          </h2>
          <p>
            {"Comparte la ubicación del proyecto y aclara si solo necesitas materiales o si quieres consultar por entrega, medición final, instalación o coordinación de permisos. Revisa la cotización partida por partida, aclara las exclusiones y confirma quién se encarga de cada paso. Antes de ordenar, haz verificar las medidas y la configuración definitivas."}
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
