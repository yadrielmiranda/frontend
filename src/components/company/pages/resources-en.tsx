import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function ResourcesEnContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"Practical guides for impact windows and doors"}
          </h1>
          <p className="lead">
            {"Use these guides to prepare better project information and compare options on equal terms before ordering."}
          </p>
        </div>
      </header>
      <section className="section" id="guides">
        <div className="wrap">
          <ul className="text-list">
            <li>
              <h2>
                <Link href="/resources/prepare-your-quote">
                  {"How to prepare a quote for impact windows and doors"}
                </Link>
              </h2>
              <p>
                {"Start with a list of openings, approximate dimensions and photos. A clear scope helps the sales team build a more useful estimate and shows which details still need confirmation before you order."}
              </p>
            </li>
            <li>
              <h2>
                <Link href="/resources/compare-impact-products">
                  {"How to compare impact products and check the documentation"}
                </Link>
              </h2>
              <p>
                {"Compare windows and doors by manufacturer, series and configuration, not by appearance or price alone. Use the applicable documents to check that the quoted unit matches the project requirements."}
              </p>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
