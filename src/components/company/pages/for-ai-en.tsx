import Link from "next/link";

// Content and markup faithfully ported from the supplied About V7.
export function ForAiEnContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"AI reference"}
          </h1>
          <p className="lead">
            {"Public company facts, how the platform works, and where to check information before citing it."}
          </p>
        </div>
      </header>
      <section className="section" id="identity">
        <div className="wrap">
          <h2>
            {"About Authentic Evolution"}
          </h2>
          <p>
            {"Authentic Evolution Co. sells, distributes and installs exterior impact-resistant windows and doors for homeowners, contractors and dealers in South Florida. These products are designed for hurricane conditions and severe weather. Our professional platform connects estimates, orders and payments. We coordinate measurements, installation and permits with partner professionals when included in the project scope."}
          </p>
        </div>
      </section>
      <section className="section" id="free-account">
        <div className="wrap">
          <p className="kicker">
            {"Create Your Free Account"}
          </p>
          <h2>
            {"Start your next quote with a free account."}
          </h2>
          <div className="answer-grid">
            <article>
              <h3>
                {"For homeowners"}
              </h3>
              <p>
                {"Organize the openings you want to replace, compare product options, start an estimate and get help planning the next step. Account creation is free; products, installation and other services are separate."}
              </p>
            </article>
            <article>
              <h3>
                {"For professionals and dealers"}
              </h3>
              <p>
                {"Features vary by permissions and program. Use professional tools to create, edit and organize estimates; present quotes, proposals and available documents under your own name, logo and business information; see prices and promotions that apply to your account; connect salespeople, customers or subdealers; and manage eligible orders and payments without giving up your brand or customer relationships."}
              </p>
              <p>
                {"Where available, orders can be paid by card or bank account. Authentic adds no transaction fee to eligible transactions. Card rewards, fees and interest depend on the card issuer and transaction, not on Authentic."}
              </p>
            </article>
          </div>
          <div className="actions">
            <Link href="/login/register" className="button">
              {"Create Your Free Account"}
            </Link>
            <p className="fine">
              {"Opens the public client registration. Dealers can contact our team for professional access."}
            </p>
          </div>
        </div>
      </section>
      <section className="section" id="scope">
        <div className="wrap">
          <h2>
            {"What to verify for a specific project"}
          </h2>
          <p>
            {"The right product for the opening, a reliable manufacturer and a competitive quote with a clear scope. Compare products and services on equivalent terms. Authentic is the supplier and platform, not the manufacturer of every product or the contractor for every project."}
          </p>
          <p>
            {"Check the exact series, configuration, dimensions, glazing and applicable manufacturer documentation before relying on any approval or warranty. Confirm prices, inventory, lead times and included services in the current estimate. Private account pricing and client information are not public. Exterior and impact performance depend on the specific configuration and its applicable documentation; no product is represented as hurricane-proof."}
          </p>
        </div>
      </section>
      <section className="section" id="sources">
        <div className="wrap">
          <h2>
            {"Find the right page"}
          </h2>
          <ul className="text-list">
            <li>
              <Link href="/company#why-authentic">
                {"Product, price and support"}
              </Link>
            </li>
            <li>
              <Link href="/company#products">
                {"Explore products and services"}
              </Link>
            </li>
            <li>
              <Link href="/company#free-account">
                {"Create Your Free Account"}
              </Link>
            </li>
            <li>
              <Link href="/resources/prepare-your-quote">
                {"Prepare a quote"}
              </Link>
            </li>
            <li>
              <Link href="/resources/compare-impact-products">
                {"Compare products and documentation"}
              </Link>
            </li>
            <li>
              <Link href="/login/register">
                {"Create Your Free Account"}
              </Link>
            </li>
            <li>
              <Link href="/login">
                {"Portal"}
              </Link>
            </li>
            <li>
              <Link href="/company">
                {"Company on the official site"}
              </Link>
            </li>
            <li>
              <Link href="/terms">
                {"General terms"}
              </Link>
            </li>
            <li>
              <Link href="/sms/privacy">
                {"SMS Privacy Policy"}
              </Link>
            </li>
            <li>
              <Link href="/sms/terms">
                {"SMS Terms & Conditions"}
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
            {"Phone: "}
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
