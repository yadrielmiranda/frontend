import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function CompareImpactProductsEnContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"How to compare impact products and check the documentation"}
          </h1>
          <p className="lead">
            {"Compare windows and doors by manufacturer, series and configuration, not by appearance or price alone. Use the applicable documents to check that the quoted unit matches the project requirements."}
          </p>
        </div>
      </header>
      <section className="section" id="step-1">
        <div className="wrap">
          <h2>
            {"Compare equivalent products and scopes"}
          </h2>
          <p>
            {"List the manufacturer, series, configuration, dimensions, glass and frame finish for each option. Compare quantities and any delivery, installation, permit coordination or other charges separately. A lower total is not necessarily a better price if it covers a different product or a narrower scope."}
          </p>
        </div>
      </section>
      <section className="section" id="step-2">
        <div className="wrap">
          <h2>
            {"Ask for the documents that match your unit"}
          </h2>
          <p>
            {"Request the manufacturer’s current product and installation documentation and the applicable approval record. Check that the manufacturer, series and revision match the documents cited in the quote. Verify that the drawings and tables address the actual size, configuration and glass option proposed. A document for a related product is not evidence that it applies to yours."}
          </p>
        </div>
      </section>
      <section className="section" id="step-3">
        <div className="wrap">
          <h2>
            {"Confirm the project-specific details"}
          </h2>
          <p>
            {"Ask the qualified professional responsible for the job to confirm which approval and installation details apply to the specific opening and site. Resolve any mismatch between the quote and the documentation before ordering. Keep the final estimate and the corresponding documents together so everyone can refer to the same version."}
          </p>
        </div>
      </section>
      <section className="section" id="contact">
        <div className="wrap">
          <Link href="/login/register" className="button">
            {"Create Your Free Account"}
          </Link>
          <div className="actions">
            <a href="mailto:sales@authenticevolutionco.com">
              {"Ask for help preparing an estimate"}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
