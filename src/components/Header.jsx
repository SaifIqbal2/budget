export default function Header({ title, subtitle, onMenuToggle }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="main-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="header-right">
        <span className="header-date">{dateStr}</span>
      </div>
    </header>
  );
}
