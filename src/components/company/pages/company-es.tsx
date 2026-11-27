import { CompanyProductGallery } from "../company-product-gallery";
import { CompanyRegistrationLink } from "../company-registration-link";

// Content and markup faithfully ported from the supplied About V7.
export function CompanyEsContent() {
  return (
    <main id="main">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">
              <i />
              {" SUR DE FLORIDA · VENTANAS Y PUERTAS DE IMPACTO PARA HURACANES"}
            </p>
            <h1>
              {"Ventanas y puertas"}
              <br />
              {"de impacto "}
              <em>
                {"para huracanes"}
              </em>
            </h1>
            <p className="lead">
              {"Vendemos e instalamos ventanas y puertas exteriores de impacto diseñadas para los huracanes y el clima severo del sur de Florida. Crea tu cuenta gratis y empieza tu primera cotización en la plataforma profesional de Authentic."}
            </p>
            <div className="actions">
              <CompanyRegistrationLink className="button" data-cta="free-account" data-placement="hero">
                {"Crea tu cuenta GRATIS"}
              </CompanyRegistrationLink>
              <a className="link" href="#products">
                {"Explora los productos"}
              </a>
            </div>
            <p className="hero-note">
              {"El registro es gratis. Los productos, la instalación y otros servicios se cotizan por separado."}
            </p>
          </div>
          <figure>
            <video
              src="/company/portada.mp4"
              poster="/company/portada-poster.jpg"
              aria-label="Casa de dos plantas con ventanas de impacto y puertas de garaje de vidrio"
              width={1280}
              height={720}
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
            />
            <figcaption>
              <span>
                {"PROYECTO DESTACADO"}
              </span>
              <span>
                {"VENTANAS Y PUERTAS DE GARAJE"}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>
      <section id="why-authentic" className="section proof">
        <div className="wrap">
          <p className="kicker">
            <i />
            {" AUTHENTIC EVOLUTION"}
          </p>
          <h2>
            {"Compara opciones. Ten claro qué compras."}
          </h2>
          <div className="proof-grid">
            <article>
              <span>
                {"01"}
              </span>
              <h3>
                {"Una cotización competitiva que puedes comparar"}
              </h3>
              <p>
                {"Compara el mismo fabricante, serie, medidas, vidrio y acabado. Revisa por separado la entrega, la instalación y los permisos: un precio menor en materiales puede corresponder a un alcance distinto."}
              </p>
            </article>
            <article>
              <span>
                {"02"}
              </span>
              <h3>
                {"Documentación del producto que elijas"}
              </h3>
              <p>
                {"Pídenos la documentación del fabricante y la garantía aplicables a tu serie y configuración. Consulta la aprobación de producto de Florida correspondiente antes de basarte en una clasificación."}
              </p>
              <a href="https://floridabuilding.org/pr/pr_app_srch.aspx">
                {"Consultar las aprobaciones de Florida"}
              </a>
            </article>
            <article>
              <span>
                {"03"}
              </span>
              <h3>
                {"Una empresa real con un equipo al que puedes contactar"}
              </h3>
              <p>
                {"Authentic Evolution Co. es una empresa de Florida con sede en Miramar. Habla con nuestro equipo para confirmar disponibilidad, qué cubre la garantía y quién responde por cada servicio incluido."}
              </p>
              <a href="https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResultDetail?inquirytype=EntityName&directionType=Initial&searchNameOrder=AUTHENTICEVOLUTION%20P200000287641&aggregateId=domp-p20000028764-e9583f48-21b3-4ef1-83d0-42a72ef68190&searchTerm=Authentic%20Evolution%20Co&listNameOrder=AUTHENTICEVOLUTION%20P200000287641">
                {"Verificar nuestro registro comercial en Florida"}
              </a>
            </article>
          </div>
        </div>
      </section>
      <section id="products" className="section">
        <div className="wrap">
          <p className="kicker">
            <i />
            {" 01 / PRODUCTOS"}
          </p>
          <h2>
            {"Productos para cada espacio y necesidad."}
          </h2>
          <p className="intro">
            {"Una ventana fija, una puerta corrediza de patio y una puerta principal cumplen funciones distintas en el exterior. Ofrecemos productos de impacto de ECO Window Systems y ECO NOVO y te ayudamos a elegir según el tamaño de la abertura, el uso y el estilo que buscas."}
          </p>
          <div className="products">
            <article>
              <CompanyProductGallery category="windows" locale="es" />
              <div>
                <p className="tag">
                  {"VENTANAS"}
                </p>
                <h3>
                  {"Ventanas de impacto"}
                </h3>
                <p>
                  {"Elige entre ventanas de guillotina con apertura vertical, ventanas corredizas horizontales o ventanas fijas que enmarcan la vista sin abrirse. La serie 100 de ECO es un ejemplo de ventana de guillotina."}
                </p>
              </div>
            </article>
            <article>
              <CompanyProductGallery category="sliding" locale="es" />
              <div>
                <p className="tag">
                  {"PUERTAS CORREDIZAS"}
                </p>
                <h3>
                  {"Puertas corredizas de vidrio"}
                </h3>
                <p>
                  {"Conecta una habitación con el patio, el balcón o la piscina mediante una puerta corrediza de dos o más paneles. En líneas como las series 750 y 755 de ECO, te ayudamos a comparar qué paneles se mueven, cuáles quedan fijos y cómo se abre la puerta."}
                </p>
              </div>
            </article>
            <article>
              <CompanyProductGallery category="entry" locale="es" />
              <div>
                <p className="tag">
                  {"PUERTAS ABATIBLES EXTERIORES"}
                </p>
                <h3>
                  {"Puertas francesas y de entrada exteriores"}
                </h3>
                <p>
                  {"Para entradas principales y otras aberturas exteriores con bisagras, ofrecemos puertas de una o dos hojas, incluidas las puertas francesas ECO serie 600. Antes de realizar la orden, te ayudamos a confirmar el sentido de apertura, el vidrio y el acabado del marco."}
                </p>
              </div>
            </article>
          </div>
          <p className="fine">
            {"Las fotos muestran ejemplos de las categorías. Las medidas, los vidrios, las configuraciones y los documentos de aprobación dependen de la serie y la unidad seleccionadas."}
          </p>
        </div>
      </section>
      <section id="process" className="section band">
        <div className="wrap split">
          <div>
            <p className="kicker">
              <i />
              {" 02 / APOYO PARA TU PROYECTO"}
            </p>
            <h2>
              {"De la cotización"}
              <br />
              {"a la instalación."}
            </h2>
            <p className="intro">
              {"Algunos clientes ya cuentan con un instalador; otros prefieren ayuda para coordinar el trabajo. Cotizamos los materiales por separado de los servicios para que sepas qué está incluido y quién se encarga de las mediciones, la instalación y los permisos antes de confirmar."}
            </p>
          </div>
          <ol className="steps">
            <li>
              <span>
                {"01"}
              </span>
              <div>
                <h3>
                  {"Cuéntanos qué necesitas"}
                </h3>
                <p>
                  {"Llámanos, escríbenos o crea una cuenta en la plataforma. Dinos dónde está el proyecto, qué ventanas o puertas quieres reemplazar y cuáles son tus prioridades. En esta etapa ayudan las medidas aproximadas y las fotos."}
                </p>
              </div>
            </li>
            <li>
              <span>
                {"02"}
              </span>
              <div>
                <h3>
                  {"Revisa la cotización"}
                </h3>
                <p>
                  {"Revisamos el producto, la configuración, el vidrio y el acabado para cada abertura. Con la cotización puedes revisar los materiales propuestos y los servicios solicitados antes de decidir cómo seguir."}
                </p>
              </div>
            </li>
            <li>
              <span>
                {"03"}
              </span>
              <div>
                <h3>
                  {"Confirma las medidas y los siguientes pasos"}
                </h3>
                <p>
                  {"Confirma las medidas finales antes de realizar la orden. Si el proyecto incluye instalación o ayuda con permisos, coordinamos esos pasos con los profesionales locales responsables del trabajo."}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
      <section id="dealers" className="section">
        <div className="wrap dealer">
          <div>
            <p className="kicker">
              <i />
              {" 03 / PROGRAMA PARA DISTRIBUIDORES"}
            </p>
            <h2>
              {"Cotiza con"}
              <br />
              {"tu propia marca."}
            </h2>
            <p className="intro">
              {"Mantén tu marca al frente de la relación con tus clientes. Authentic ofrece a los distribuidores un espacio para preparar cotizaciones con su propia marca, gestionar órdenes y seguir su estado. Si trabajas con vendedores o subdistribuidores, puedes gestionar esa red desde tu cuenta sin tener que reenviar cada cotización."}
            </p>
            <CompanyRegistrationLink dealer className="button">
              {"Consulta el acceso para distribuidores "}
              <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16">
                <path d="M4 12L12 4m-6 0h6v6" />
              </svg>
            </CompanyRegistrationLink>
          </div>
          <aside>
            <p className="tag">
              {"HERRAMIENTAS PARA DISTRIBUIDORES"}
            </p>
            <ul>
              <li>
                {"Cotiza las aberturas que mediste"}
              </li>
              <li>
                {"Comparte cotizaciones con tu propia marca"}
              </li>
              <li>
                {"Gestiona las órdenes y consulta su estado en el portal"}
              </li>
            </ul>
          </aside>
        </div>
      </section>
      <section id="company" className="section band">
        <div className="wrap split">
          <div>
            <p className="kicker">
              <i />
              {" 04 / NUESTRA EMPRESA"}
            </p>
            <h2>
              {"Authentic"}
              <br />
              {"Evolution Co."}
            </h2>
            <p className="intro">
              {"Authentic Evolution Co. es una empresa de Florida, con sede en Miramar, especializada en la venta, distribución e instalación de ventanas y puertas exteriores de impacto para huracanes y clima severo. Reunimos la selección de productos, las cotizaciones y la gestión de órdenes, con apoyo para coordinar proyectos cuando hace falta. Los propietarios pueden consultarnos directamente; los contratistas y distribuidores pueden usar la plataforma para cotizar y gestionar trabajos para sus propios clientes."}
            </p>
          </div>
          <div className="contact" id="contact">
            <h3>
              {"Habla con nuestro equipo"}
            </h3>
            <p>
              {"Para consultar sobre un producto, solicitar una cotización o recibir ayuda para abrir una cuenta de distribuidor, contacta a nuestro equipo de ventas por teléfono o correo. También puedes ver fotos de proyectos y novedades sobre productos en nuestras redes oficiales."}
            </p>
            <address>
              <span>
                <strong>
                  {"Dirección comercial"}
                </strong>
                <br />
                {"2320 Sabal Palm Dr"}
                <br />
                {"Miramar, FL 33023"}
              </span>
              <a href="tel:+17869994224">
                {"+1 (786) 999-4224"}
              </a>
              <a href="mailto:sales@authenticevolutionco.com">
                {"sales@authenticevolutionco.com"}
              </a>
            </address>
            <div className="social-block">
              <p className="social-label">
                {"SIGUE A AUTHENTIC EVOLUTION"}
              </p>
              <div className="social-links">
                <a href="https://www.instagram.com/authenticevolutionco/" target="_blank" rel="noopener noreferrer">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.4" cy="6.8" r=".65" fill="currentColor" />
                  </svg>
                  {" Instagram"}
                </a>
                <a href="https://www.facebook.com/449194874949950" target="_blank" rel="noopener noreferrer">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M14 21v-8h3l.5-3H14V8c0-1 .3-2 2-2h2V3.4c-.7-.2-1.6-.4-2.7-.4-3 0-5.3 1.8-5.3 5v2H7v3h3v8" fill="currentColor" stroke="none" />
                  </svg>
                  {" Facebook"}
                </a>
              </div>
            </div>
            <div className="actions">
              <CompanyRegistrationLink className="link" data-route="registration" aria-describedby="next-account">
                {"Crea tu cuenta "}
                <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16">
                  <path d="M4 12L12 4m-6 0h6v6" />
                </svg>
              </CompanyRegistrationLink>
            </div>
            <span className="sr" id="next-account">
              {"Abre el formulario público de registro de clientes."}
            </span>
          </div>
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
                {"Las funciones dependen de los permisos y del programa. Usa herramientas profesionales para crear, editar y organizar cotizaciones; presenta cotizaciones, propuestas y documentos disponibles con tu nombre, logo y datos comerciales; consulta los precios y las promociones de tu cuenta; conecta vendedores, clientes o subdistribuidores; y administra órdenes y pagos elegibles sin ceder tu marca ni la relación con tus clientes."}
              </p>
              <p>
                {"Donde esté disponible, paga tus órdenes con tarjeta o cuenta bancaria. Authentic no añade comisiones de transacción a las operaciones elegibles. Los puntos, intereses y cargos de la tarjeta dependen del emisor y de la operación, no de Authentic."}
              </p>
            </article>
          </div>
          <div className="actions">
            <CompanyRegistrationLink className="button">
              {"Crea tu cuenta GRATIS"}
            </CompanyRegistrationLink>
            <p className="fine">
              {"Abre el registro público de clientes. Para acceso de distribuidor, contacta a nuestro equipo."}
            </p>
          </div>
        </div>
      </section>
      <section className="section" id="team">
        <div className="wrap">
          <div className="answer-grid">
            <article>
              <h3>
                {"Quién se ocupa de cada paso"}
              </h3>
              <p>
                {"Ventas te ayuda a elegir productos y preparar una cotización. El equipo también puede explicarte el programa para distribuidores y el proceso de órdenes. Cuando tu proyecto incluye mediciones en obra, instalación o apoyo con permisos, coordinamos con los profesionales responsables de ese trabajo."}
              </p>
            </article>
            <article>
              <h3>
                {"Producto, precio y respaldo"}
              </h3>
              <p>
                {"El producto adecuado para cada abertura, un fabricante confiable y una cotización competitiva que explique qué incluye. Compara productos y servicios en condiciones equivalentes. Authentic es el proveedor y la plataforma; no es el fabricante de todos los productos ni el contratista de todos los proyectos."}
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="section" id="resources">
        <div className="wrap">
          <p className="kicker">
            {"Recursos"}
          </p>
          <h2>
            {"Guías prácticas de ventanas y puertas de impacto"}
          </h2>
          <p>
            {"Usa estas guías para preparar los datos de tu proyecto y comparar opciones en igualdad de condiciones antes de ordenar."}
          </p>
          <ul className="text-list">
            <li>
              <a href="/es/resources/prepare-your-quote">
                {"Cómo preparar una cotización de ventanas y puertas de impacto"}
              </a>
              <p>
                {"Empieza con una lista de las aberturas, medidas aproximadas y fotos. Un alcance claro ayuda al equipo comercial a preparar una cotización más útil y a identificar qué datos quedan por confirmar antes de realizar la orden."}
              </p>
            </li>
            <li>
              <a href="/es/resources/compare-impact-products">
                {"Cómo comparar productos de impacto y revisar su documentación"}
              </a>
              <p>
                {"Compara ventanas y puertas por fabricante, serie y configuración, no solo por apariencia o precio. Usa la documentación aplicable para comprobar que la unidad cotizada corresponda a las necesidades del proyecto."}
              </p>
            </li>
          </ul>
          <a href="/es/for-ai" className="link">
            {"Referencia para IA"}
          </a>
        </div>
      </section>
      <section className="section" id="faq">
        <div className="wrap">
          <div className="answer-grid">
            <div>
              <p className="kicker">
                {"Sobre Authentic Evolution"}
              </p>
              <h2>
                {"Preguntas frecuentes"}
              </h2>
            </div>
            <div className="answers">
              <details>
                <summary>
                  {"¿Crear una cuenta es gratis?"}
                </summary>
                <p>
                  {"Sí. Crear la cuenta es gratis. Los productos, la mano de obra, los permisos y otros servicios se cotizan según el proyecto."}
                </p>
              </details>
              <details>
                <summary>
                  {"¿Puedo comprar solo materiales, sin instalación?"}
                </summary>
                <p>
                  {"Sí. Solicita una cotización solo de materiales o pregunta por la coordinación de instalación y permisos. La cotización escrita identifica qué incluye."}
                </p>
              </details>
              <details>
                <summary>
                  {"¿Puedo cotizar con mi propia marca como distribuidor?"}
                </summary>
                <p>
                  {"El espacio para distribuidores ofrece herramientas de cotización con marca propia y funciones de red comercial para cuentas elegibles. Confirma las herramientas y los roles disponibles para tu perfil."}
                </p>
              </details>
              <details>
                <summary>
                  {"¿Tengo que aceptar mensajes de texto para crear una cuenta?"}
                </summary>
                <p>
                  {"No. El registro presenta opciones separadas y voluntarias para mensajes de servicio y promociones. Dar tu número de teléfono no equivale a aceptar mensajes."}
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
      <section id="sms" className="section slim">
        <div className="wrap split">
          <div>
            <p className="kicker">
              <i />
              {" 05 / SMS Y PRIVACIDAD"}
            </p>
            <h2>
              {"Tú decides qué"}
              <br />
              {"mensajes recibir."}
            </h2>
          </div>
          <div className="sms">
            <p>
              {"Al registrarte, puedes elegir si quieres recibir avisos de servicio o mensajes promocionales. Son dos opciones independientes y voluntarias. Puedes crear una cuenta o hacer una compra sin marcar ninguna casilla. Dar tu número de teléfono no te suscribe por sí solo a los mensajes de texto."}
            </p>
            <p>
              {"Los mensajes de servicio pueden tratar sobre cotizaciones, citas de instalación, órdenes, pagos o novedades de tu cuenta. Si aceptas por separado los mensajes promocionales, estos pueden incluir ofertas o novedades de productos. La frecuencia varía. Pueden aplicarse cargos por mensajes y datos. Responde "}
              <strong>
                {"STOP"}
              </strong>
              {" para darte de baja o "}
              <strong>
                {"HELP"}
              </strong>
              {" para obtener ayuda. También puedes escribirnos a "}
              <a href="mailto:sales@authenticevolutionco.com">
                {"sales@authenticevolutionco.com"}
              </a>
              {"."}
            </p>
            <p>
              {"No vendemos ni compartimos los datos móviles con fines de marketing de terceros. Los datos de suscripción y el consentimiento para recibir mensajes de texto no se comparten con terceros."}
            </p>
            <div className="policy-links">
              <a href="/sms/privacy">
                {"Política de privacidad de SMS"}
              </a>
              <a href="/sms/terms">
                {"Términos y condiciones de SMS"}
              </a>
            </div>
          </div>
        </div>
      </section>
      <section id="first-quote" className="section band">
        <div className="wrap split">
          <div>
            <p className="kicker">
              <i />
              {" Qué puedes hacer después de registrarte"}
            </p>
            <h2>
              {"¿Listo para empezar tu primera cotización?"}
            </h2>
            <p className="intro">
              {"Crea una cuenta gratuita de cliente para comenzar. Si eres distribuidor o contratista y buscas acceso profesional, contacta a nuestro equipo para configurarlo."}
            </p>
            <div className="actions">
              <CompanyRegistrationLink className="button" data-cta="free-account" data-placement="closing">
                {"Crea tu cuenta GRATIS"}
              </CompanyRegistrationLink>
            </div>
          </div>
          <div className="role-cards">
            <article>
              <h3>
                {"Propietarios"}
              </h3>
              <p>
                {"Empieza tu propia cotización. Compara productos y opciones para tus aberturas y recibe ayuda para verificar las medidas finales y qué incluye el trabajo."}
              </p>
            </article>
            <article>
              <h3>
                {"Distribuidores y profesionales"}
              </h3>
              <p>
                {"Cotiza con tu propia marca, organiza tu red comercial y gestiona órdenes. Las condiciones de precio, las opciones de pago y las herramientas profesionales dependen de tu perfil y sus funciones habilitadas."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
