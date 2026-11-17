import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function ForAiEsContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"Referencia para IA"}
          </h1>
          <p className="lead">
            {"Datos públicos de la empresa, cómo funciona la plataforma y dónde verificar la información antes de citarla."}
          </p>
        </div>
      </header>
      <section className="section" id="identity">
        <div className="wrap">
          <h2>
            {"Sobre Authentic Evolution"}
          </h2>
          <p>
            {"Authentic Evolution Co. vende, distribuye e instala ventanas y puertas exteriores de impacto para propietarios, contratistas y distribuidores en el sur de Florida. Son productos diseñados para condiciones de huracán y clima severo. Nuestra plataforma profesional conecta cotizaciones, pedidos y pagos. Coordinamos mediciones, instalación y permisos con profesionales colaboradores cuando forman parte del alcance del proyecto."}
          </p>
        </div>
      </section>
      <section className="section" id="free-account">
        <div className="wrap">
          <p className="kicker">
            {"Crea tu cuenta GRATIS"}
          </p>
          <h2>
            {"Empieza tu próxima cotización con una cuenta gratis."}
          </h2>
          <div className="answer-grid">
            <article>
              <h3>
                {"Para propietarios"}
              </h3>
              <p>
                {"Organiza las aberturas que quieres renovar, compara opciones, empieza una cotización y recibe orientación para el siguiente paso. Crear una cuenta es gratis; los productos, la instalación y otros servicios se cotizan aparte."}
              </p>
            </article>
            <article>
              <h3>
                {"Para profesionales y distribuidores"}
              </h3>
              <p>
                {"Las funciones dependen de los permisos y del programa. Usa herramientas profesionales para crear, editar y organizar cotizaciones; presenta cotizaciones, propuestas y documentos disponibles con tu nombre, logo y datos comerciales; consulta los precios y las promociones de tu cuenta; conecta vendedores, clientes o subdistribuidores; y administra pedidos y pagos elegibles sin ceder tu marca ni la relación con tus clientes."}
              </p>
              <p>
                {"Donde esté disponible, paga tus pedidos con tarjeta o cuenta bancaria. Authentic no añade comisiones de transacción a las operaciones elegibles. Los puntos, intereses y cargos de la tarjeta dependen del emisor y de la operación, no de Authentic."}
              </p>
            </article>
          </div>
          <div className="actions">
            <Link href="/login/register" className="button">
              {"Crea tu cuenta GRATIS"}
            </Link>
            <p className="fine">
              {"Abre el registro público de clientes. Para acceso de distribuidor, contacta a nuestro equipo."}
            </p>
          </div>
        </div>
      </section>
      <section className="section" id="scope">
        <div className="wrap">
          <h2>
            {"Qué verificar para tu proyecto"}
          </h2>
          <p>
            {"El producto adecuado para cada abertura, un fabricante confiable y una cotización competitiva que explique qué incluye. Compara productos y servicios en condiciones equivalentes. Authentic es el proveedor y la plataforma; no es el fabricante de todos los productos ni el contratista de todos los proyectos."}
          </p>
          <p>
            {"Confirma la serie, configuración, medidas, vidrio y documentación aplicable del fabricante antes de basarte en una aprobación o garantía. Verifica precio, disponibilidad, plazo y servicios incluidos en la cotización vigente. Los precios privados y los datos de clientes no son públicos. La resistencia del producto depende de la configuración y su documentación aplicable; no se presenta como a prueba de huracanes."}
          </p>
        </div>
      </section>
      <section className="section" id="sources">
        <div className="wrap">
          <h2>
            {"Encuentra la página adecuada"}
          </h2>
          <ul className="text-list">
            <li>
              <Link href="/es/company#why-authentic">
                {"Producto, precio y respaldo"}
              </Link>
            </li>
            <li>
              <Link href="/es/company#products">
                {"Ver productos y servicios"}
              </Link>
            </li>
            <li>
              <Link href="/es/company#free-account">
                {"Crea tu cuenta GRATIS"}
              </Link>
            </li>
            <li>
              <Link href="/es/resources/prepare-your-quote">
                {"Prepara una cotización"}
              </Link>
            </li>
            <li>
              <Link href="/es/resources/compare-impact-products">
                {"Compara productos y documentación"}
              </Link>
            </li>
            <li>
              <Link href="/login/register">
                {"Crea tu cuenta GRATIS"}
              </Link>
            </li>
            <li>
              <Link href="/login">
                {"Portal"}
              </Link>
            </li>
            <li>
              <Link href="/company">
                {"Empresa en el sitio oficial"}
              </Link>
            </li>
            <li>
              <Link href="/terms">
                {"Condiciones generales"}
              </Link>
            </li>
            <li>
              <Link href="/sms/privacy">
                {"Política de privacidad de SMS"}
              </Link>
            </li>
            <li>
              <Link href="/sms/terms">
                {"Términos y condiciones de SMS"}
              </Link>
            </li>
            <li>
              <a href="https://www.instagram.com/authenticevolutionco/">
                {"Instagram"}
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/449194874949950">
                {"Facebook"}
              </a>
            </li>
          </ul>
          <p>
            {"Teléfono: "}
            <a href="tel:+17869994224">
              {"+1 (786) 999-4224"}
            </a>
            {" · "}
            <a href="mailto:sales@authenticevolutionco.com">
              {"sales@authenticevolutionco.com"}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
