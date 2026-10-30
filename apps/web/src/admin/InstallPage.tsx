import { adminTextsI18n as adminTexts } from './fr';

export function InstallPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>{adminTexts.install.title}</h1>
          <p>{adminTexts.install.subtitle}</p>
        </div>
      </header>

      <section className="admin-card admin-install">
        <p className="admin-install__lead">{adminTexts.install.benefit}</p>

        <div className="admin-install__grid">
          <article className="admin-install__platform">
            <h2>{adminTexts.install.ipadTitle}</h2>
            <ol>
              {adminTexts.install.ipadSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className="admin-install__platform">
            <h2>{adminTexts.install.androidTitle}</h2>
            <ol>
              {adminTexts.install.androidSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="admin-card admin-install__pin">
        <h2>{adminTexts.install.pinTitle}</h2>
        <p>{adminTexts.install.pinText}</p>
        <p className="admin-muted">{adminTexts.install.pinDetail}</p>
      </section>

      <section className="admin-card">
        <h2>{adminTexts.install.offlineTitle}</h2>
        <p>{adminTexts.install.offlineText}</p>
        <p className="admin-muted">{adminTexts.install.orientationText}</p>
      </section>

      <p className="admin-muted admin-install__note">
        {adminTexts.install.note}
      </p>
    </section>
  );
}
