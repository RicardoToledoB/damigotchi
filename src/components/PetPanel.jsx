import DamigotchiAvatar from "./DamigotchiAvatar";

const NEEDS = [
  ["comida", "🍎", "Hambre"],
  ["baño", "🛁", "Baño"],
  ["sueño", "😴", "Sueño"],
  ["cariño", "💛", "Cariño"],
  ["aprendizaje", "📚", "Aprender"]
];

export default function PetPanel({ pet, onCare, setMode }) {
  return (
    <section className="pet-card">
      <div className="pet-name">{pet.name}</div>
      <DamigotchiAvatar pet={pet} />
      <div className="level-pill">Nivel {pet.level} · ⭐ {pet.stars} · 🔥 {pet.streak}</div>

      <div className="closet-actions">
        <button onClick={() => setMode("tienda")}>🛍️ Tienda</button>
        <button onClick={() => setMode("vestidor")}>👕 Vestidor</button>
      </div>

      <div className="needs">
        {NEEDS.map(([key, emoji, label]) => (
          <div className="need" key={key}>
            <span>{emoji}</span>
            <div className="bar"><div style={{ width: `${pet.needs[key]}%` }} /></div>
            <button onClick={() => onCare(key)}>{label}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
