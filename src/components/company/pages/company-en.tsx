import Link from "next/link";
import { CompanyProductGallery } from "../company-product-gallery";
import { CompanyRegistrationLink } from "../company-registration-link";

// Content and markup faithfully ported from the supplied About V7.
export function CompanyEnContent() {
  return (
    <main id="main">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">
              <i />
              {" SOUTH FLORIDA · HURRICANE IMPACT WINDOWS & DOORS"}
            </p>
            <h1>
              {"Hurricane impact"}
              <br />
              {"windows & doors"}
            </h1>
            <p className="lead">
              {"We sell and install exterior impact-resistant windows and doors designed for South Florida’s hurricanes and severe weather. Create a free account to start your first estimate in Authentic’s professional quoting platform."}
            </p>
            <div className="actions">
              <CompanyRegistrationLink className="button" data-cta="free-account" data-placement="hero">
                {"Create Your Free Account"}
              </CompanyRegistrationLink>
              <a className="link" href="#products">
                {"Explore products"}
              </a>
            </div>
            <p className="hero-note">
              {"Free to register. Products, installation and other services are quoted separately."}
            </p>
          </div>
          <figure>
            <video
              src="/company/portada.mp4"
              poster="/company/portada-poster.jpg"
              aria-label="A two-story home with impact windows and glass garage doors"
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
                {"PROJECT SPOTLIGHT"}
              </span>
              <span>
                {"WINDOWS AND GARAGE DOORS"}
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
            {"Compare options. Know what you’re buying."}
          </h2>
          <div className="proof-grid">
            <article>
              <span>
                {"01"}
              </span>
              <h3>
                {"Competitive quotes you can compare"}
              </h3>
              <p>
                {"Look at the same manufacturer, series, dimensions, glass and finish. Then compare delivery, installation and permits separately, so a lower materials price does not hide a different scope."}
              </p>
            </article>
            <article>
              <span>
                {"02"}
              </span>
              <h3>
                {"Documentation for the product you choose"}
              </h3>
              <p>
                {"Ask our team for the manufacturer documents and warranty that apply to your exact series and configuration. Review the applicable Florida product approval before relying on a rating."}
              </p>
              <a href="https://floridabuilding.org/pr/pr_app_srch.aspx">
                {"Search Florida Product Approvals"}
              </a>
            </article>
            <article>
              <span>
                {"03"}
              </span>
              <h3>
                {"A real company with a team you can reach"}
              </h3>
              <p>
                {"Authentic Evolution Co. is a Florida company based in Miramar. Contact our sales team to confirm availability, warranty coverage and who is responsible for each service in your estimate."}
              </p>
              <a href="https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResultDetail?inquirytype=EntityName&directionType=Initial&searchNameOrder=AUTHENTICEVOLUTION%20P200000287641&aggregateId=domp-p20000028764-e9583f48-21b3-4ef1-83d0-42a72ef68190&searchTerm=Authentic%20Evolution%20Co&listNameOrder=AUTHENTICEVOLUTION%20P200000287641">
                {"Verify our Florida business registration"}
              </a>
            </article>
          </div>
        </div>
      </section>
      <section id="products" className="section">
        <div className="wrap">
          <p className="kicker">
            <i />
            {" 01 / WHAT WE SELL"}
          </p>
          <h2>
            {"Products for the way you use your space."}
          </h2>
          <p className="intro">
            {"A picture window, a patio slider and a front entry door serve different exterior openings. We carry impact products from ECO Window Systems and ECO NOVO and help you narrow down the choices based on the size of the opening, how you use it and the look you want."}
          </p>
          <div className="products">
            <article>
              <CompanyProductGallery category="windows" locale="en" />
              <div>
                <p className="tag">
                  {"WINDOWS"}
                </p>
                <h3>
                  {"Impact windows"}
                </h3>
                <p>
                  {"Choose single-hung windows that open vertically, horizontal rollers that slide side to side, or fixed picture windows that frame the view without opening. The ECO Series 100 is one example of a single-hung option."}
                </p>
              </div>
            </article>
            <article>
              <CompanyProductGallery category="sliding" locale="en" />
              <div>
                <p className="tag">
                  {"SLIDING DOORS"}
                </p>
                <h3>
                  {"Sliding glass doors"}
                </h3>
                <p>
                  {"Open a room to a patio, balcony or pool area with a two-panel or multi-panel sliding door. With lines such as ECO Series 750 and 755, we can help you compare which panels move, which stay fixed and how the door opens."}
                </p>
              </div>
            </article>
            <article>
              <CompanyProductGallery category="entry" locale="en" />
              <div>
                <p className="tag">
                  {"EXTERIOR HINGED DOORS"}
                </p>
                <h3>
                  {"Exterior French & entry doors"}
                </h3>
                <p>
                  {"For front entrances and other exterior openings, we offer single and double-door configurations, including ECO Series 600 French doors. Before you order, we help you confirm the swing, glass and frame finish."}
                </p>
              </div>
            </article>
          </div>
          <p className="fine">
            {"Photos illustrate the product categories. Available sizes, glazing, configurations and approval documents depend on the series and the unit selected."}
          </p>
        </div>
      </section>
      <section id="process" className="section band">
        <div className="wrap split">
          <div>
            <p className="kicker">
              <i />
              {" 02 / PROJECT SUPPORT"}
            </p>
            <h2>
              {"From quote"}
              <br />
              {"to installation."}
            </h2>
            <p className="intro">
              {"Some customers already have an installer; others want help coordinating the work. We quote materials separately from services so you know what is included and who will handle measurements, installation and permits before you commit."}
            </p>
          </div>
          <ol className="steps">
            <li>
              <span>
                {"01"}
              </span>
              <div>
                <h3>
                  {"Tell us what you need"}
                </h3>
                <p>
                  {"Call or email our team, or create an account on the platform. Tell us where the project is, which openings you want to replace and what matters most to you. Approximate measurements and photos are helpful at this stage."}
                </p>
              </div>
            </li>
            <li>
              <span>
                {"02"}
              </span>
              <div>
                <h3>
                  {"Review the estimate"}
                </h3>
                <p>
                  {"We work through the product, configuration, glass and finish for each opening. The estimate lets you review the proposed materials and any requested services before deciding how to proceed."}
                </p>
              </div>
            </li>
            <li>
              <span>
                {"03"}
              </span>
              <div>
                <h3>
                  {"Confirm measurements and next steps"}
                </h3>
                <p>
                  {"Confirm final measurements before ordering. When installation or permit assistance is part of your scope, we coordinate those steps with the local professionals responsible for the work."}
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
              {" 03 / DEALER PROGRAM"}
            </p>
            <h2>
              {"Quote under"}
              <br />
              {"your own brand."}
            </h2>
            <p className="intro">
              {"Keep your own brand in front of your customers. Authentic gives dealers a workspace to build branded estimates, manage orders and track their progress. Dealers who work with salespeople or subdealers can manage that network in their account instead of passing each quote back and forth."}
            </p>
            <a className="button" href="mailto:sales@authenticevolutionco.com?subject=Authentic%20dealer%20program">
              {"Ask about dealer access "}
              <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16">
                <path d="M4 12L12 4m-6 0h6v6" />
              </svg>
            </a>
          </div>
          <aside>
            <p className="tag">
              {"THE DEALER WORKSPACE"}
            </p>
            <ul>
              <li>
                {"Build an estimate for the openings you measured"}
              </li>
              <li>
                {"Share an estimate with your own branding"}
              </li>
              <li>
                {"Manage orders and track progress in the portal"}
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
              {" 04 / OUR COMPANY"}
            </p>
            <h2>
              {"Authentic"}
              <br />
              {"Evolution Co."}
            </h2>
            <p className="intro">
              {"Authentic Evolution Co. is a Florida company based in Miramar that specializes in the sale, distribution and installation of exterior impact-resistant windows and doors for hurricanes and severe weather. We bring product selection, quoting and order management together, with project coordination available when needed. Homeowners can contact us directly about their project, and contractors and dealers can use the platform to quote and manage work for their own customers."}
            </p>
          </div>
          <div className="contact" id="contact">
            <h3>
              {"Talk to our team"}
            </h3>
            <p>
              {"For a product question, project estimate or help setting up a dealer account, reach our sales team by phone or email. You can also explore project photos and product updates on our official social profiles."}
            </p>
            <address>
              <span>
                <strong>
                  {"Business address"}
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
                {"FOLLOW AUTHENTIC EVOLUTION"}
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
                {"Create an account "}
                <svg className="arrow" aria-hidden="true" viewBox="0 0 16 16">
                  <path d="M4 12L12 4m-6 0h6v6" />
                </svg>
              </CompanyRegistrationLink>
            </div>
            <span className="sr" id="next-account">
              {"Opens the public client registration."}
            </span>
          </div>
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
            <CompanyRegistrationLink className="button">
              {"Create Your Free Account"}
            </CompanyRegistrationLink>
            <p className="fine">
              {"Opens the public client registration. Dealers can contact our team for professional access."}
            </p>
          </div>
        </div>
      </section>
      <section className="section" id="team">
        <div className="wrap">
          <div className="answer-grid">
            <article>
              <h3>
                {"Who handles each step"}
              </h3>
              <p>
                {"Sales helps you choose products and prepare an estimate. The team can also explain the dealer program and order process. When your project includes field measurements, installation or permit support, we coordinate with the professionals responsible for that work."}
              </p>
            </article>
            <article>
              <h3>
                {"Product, price and support"}
              </h3>
              <p>
                {"The right product for the opening, a reliable manufacturer and a competitive quote with a clear scope. Compare products and services on equivalent terms. Authentic is the supplier and platform, not the manufacturer of every product or the contractor for every project."}
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="section" id="resources">
        <div className="wrap">
          <p className="kicker">
            {"Resources"}
          </p>
          <h2>
            {"Practical guides for impact windows and doors"}
          </h2>
          <p>
            {"Use these guides to prepare better project information and compare options on equal terms before ordering."}
          </p>
          <ul className="text-list">
            <li>
              <Link href="/resources/prepare-your-quote">
                {"How to prepare a quote for impact windows and doors"}
              </Link>
              <p>
                {"Start with a list of openings, approximate dimensions and photos. A clear scope helps the sales team build a more useful estimate and shows which details still need confirmation before you order."}
              </p>
            </li>
            <li>
              <Link href="/resources/compare-impact-products">
                {"How to compare impact products and check the documentation"}
              </Link>
              <p>
                {"Compare windows and doors by manufacturer, series and configuration, not by appearance or price alone. Use the applicable documents to check that the quoted unit matches the project requirements."}
              </p>
            </li>
          </ul>
          <Link href="/for-ai" className="link">
            {"AI reference"}
          </Link>
        </div>
      </section>
      <section className="section" id="faq">
        <div className="wrap">
          <div className="answer-grid">
            <div>
              <p className="kicker">
                {"About Authentic Evolution"}
              </p>
              <h2>
                {"Common questions"}
              </h2>
            </div>
            <div className="answers">
              <details>
                <summary>
                  {"Is the account free?"}
                </summary>
                <p>
                  {"Yes. Creating an account is free. Products, labor, permits and other services are priced separately according to the project."}
                </p>
              </details>
              <details>
                <summary>
                  {"Can I buy materials without installation?"}
                </summary>
                <p>
                  {"Yes. Request a materials-only estimate, or ask about installation and permit coordination for your project. The written estimate states what is included."}
                </p>
              </details>
              <details>
                <summary>
                  {"Can dealers quote using their own brand?"}
                </summary>
                <p>
                  {"The dealer workspace supports branded quoting tools and commercial-network features for eligible accounts. Confirm the tools and roles available for your profile."}
                </p>
              </details>
              <details>
                <summary>
                  {"Are texts required to create an account?"}
                </summary>
                <p>
                  {"No. The registration form shows separate optional choices for service and promotional messages. A phone number alone is not consent to receive texts."}
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
              {" 05 / SMS & PRIVACY"}
            </p>
            <h2>
              {"Text updates"}
              <br />
              {"are your choice."}
            </h2>
          </div>
          <div className="sms">
            <p>
              {"When you register, you can choose whether to receive service updates or promotional texts. These are separate, optional choices. Leaving either box unchecked does not affect your ability to create an account or make a purchase. Providing a phone number alone does not enroll you in text messages."}
            </p>
            <p>
              {"Service texts can cover estimates, installation appointments, orders, payments or account updates. If you separately sign up for promotional texts, those may include offers or product news. Message frequency varies. Message and data rates may apply. Reply "}
              <strong>
                {"STOP"}
              </strong>
              {" to unsubscribe or "}
              <strong>
                {"HELP"}
              </strong>
              {" for help. You can also reach us at "}
              <a href="mailto:sales@authenticevolutionco.com">
                {"sales@authenticevolutionco.com"}
              </a>
              {"."}
            </p>
            <p>
              {"We do not sell or share mobile information for third-party marketing. Text-message opt-in data and consent are not shared with third parties."}
            </p>
            <div className="policy-links">
              <Link href="/sms/privacy">
                {"SMS Privacy Policy"}
              </Link>
              <Link href="/sms/terms">
                {"SMS Terms & Conditions"}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section id="first-quote" className="section band">
        <div className="wrap split">
          <div>
            <p className="kicker">
              <i />
              {" What you can do after you sign up"}
            </p>
            <h2>
              {"Ready to start your first estimate?"}
            </h2>
            <p className="intro">
              {"Create a free client account to get started. If you are a dealer or contractor seeking professional access, contact our team to set up the right account."}
            </p>
            <div className="actions">
              <CompanyRegistrationLink className="button" data-cta="free-account" data-placement="closing">
                {"Create Your Free Account"}
              </CompanyRegistrationLink>
            </div>
          </div>
          <div className="role-cards">
            <article>
              <h3>
                {"Homeowners"}
              </h3>
              <p>
                {"Start your own estimate. Compare products and options for your openings, then get help verifying the final measurements and what is included."}
              </p>
            </article>
            <article>
              <h3>
                {"Dealers and professionals"}
              </h3>
              <p>
                {"Use branded quotes, organize your sales network and manage orders. Professional tools, prices and payment options depend on the account’s eligibility and features."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
