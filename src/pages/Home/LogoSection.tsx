import "./home.css";

// Static brand asset, not database content — swap /public/logo.svg (or point
// this at a different filename/extension) to replace it. See README.
export function LogoSection() {
  return (
    <section className="logo-section">
      <div className="container logo-section__inner">
        <img src="/logo.svg" alt="CADseekho" className="logo-section__image" />
      </div>
    </section>
  );
}
