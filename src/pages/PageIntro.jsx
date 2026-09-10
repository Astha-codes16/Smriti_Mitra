export default function PageIntro({ eyebrow, title, icon, description, accent = 'blue', children }) {
  return (
    <div className="inner-page page-enter">
      <div className={`page-banner banner-${accent}`}>
        <div className="page-banner-icon" aria-hidden="true">{icon}</div>
        <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      </div>
      {children || <div className="coming-soon"><span>✦</span><h2>A calm space is being prepared</h2><p>This part of MindMate will be ready for you soon. For now, take a breath and explore another part of your day.</p></div>}
    </div>
  );
}