import Shell from "../components/Shell";
import PetPanel from "../components/PetPanel";

const MENU_ITEMS = [
  ["sumas", "🧮", "Sumas"],
  ["restas", "➖", "Restas"],
  ["letras", "🔤", "Letras"],
  ["palabras", "🖼️", "Palabras"],
  ["unir", "🧩", "Unir"],
  ["trazar", "✏️", "Trazar"]
];

export default function MenuPage({ setMode, pet, onCare, audio }) {
  return (
    <Shell title="Damigotchi" audio={audio} pet={pet}>
      <p className="subtitle">Aprende jugando con tu amigo digital</p>
      <PetPanel pet={pet} onCare={onCare} setMode={setMode} />
      <div className="menu-grid">
        {MENU_ITEMS.map(([id, icon, label]) => (
          <button key={id} className="menu-btn" onClick={() => { audio.click(); setMode(id); }}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>
    </Shell>
  );
}
