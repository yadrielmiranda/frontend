import { CompanyRegistrationLink } from "../company-registration-link";

// Content and markup faithfully ported from the supplied About V7.
export function PrepareYourQuoteEnContent() {
  return (
    <main id="main" className="editorial">
      <header className="section hero">
        <div className="wrap">
          <p className="kicker">
            {"Authentic Evolution Co."}
          </p>
          <h1>
            {"How to prepare a quote for impact windows and doors"}
          </h1>
          <p className="lead">
            {"Start with a list of openings, approximate dimensions and photos. A clear scope helps the sales team build a more useful estimate and shows which details still need confirmation before you order."}
          </p>
        </div>
      </header>
      <section className="section" id="step-1">
        <div className="wrap">
          <h2>
            {"Make a list of your openings"}
          </h2>
          <p>
            {"Give each opening a label, such as Kitchen 01 or Patio 02, and note how many units you need. Record the approximate width and height with units, and say whether you measured the opening, the existing frame or another reference. Take a photo from inside and outside where practical. These measurements are for the initial estimate, not for production."}
          </p>
        </div>
      </section>
      <section className="section" id="step-2">
        <div className="wrap">
          <h2>
            {"Describe how each unit should work"}
          </h2>
          <p>
            {"For windows, note whether you want a fixed or operable unit and how it should open. For doors, include the opening direction or which panels need to move. List preferences for glass, privacy and frame finish. If a choice is still open, mark it for discussion instead of guessing."}
          </p>
        </div>
      </section>
      <section className="section" id="step-3">
        <div className="wrap">
          <h2>
            {"Separate products from project services"}
          </h2>
          <p>
            {"Share the project location and say whether you need materials only or want to discuss delivery, final measurements, installation or permit coordination. Review the estimate line by line, clarify exclusions and confirm who handles each step. Before placing the order, have the final dimensions and configuration verified."}
          </p>
        </div>
      </section>
      <section className="section" id="contact">
        <div className="wrap">
          <CompanyRegistrationLink className="button">
            {"Create Your Free Account"}
          </CompanyRegistrationLink>
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
