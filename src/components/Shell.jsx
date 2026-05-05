export default function Shell({ children, title, onBack, audio, pet }) {
  return (
    <main className="screen">
      <div className="topbar">
        {onBack ? <button className="ghost" onClick={onBack}>← Menú</button> : <div />}
        <div className="mini-status">{pet ? <>⭐ {pet.stars} · Nivel {pet.level}</> : null}</div>
        <button className="ghost" onClick={() => audio.setEnabled((v) => !v)}>
          {audio.enabled ? "🔊" : "🔇"}
        </button>
      </div>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
