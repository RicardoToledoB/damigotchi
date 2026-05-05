import Shell from "../components/Shell";
import DamigotchiAvatar from "../components/DamigotchiAvatar";
import { SHOP_ITEMS } from "../data/shopItems";

export default function ClosetPage({ pet, setPet, onBack, audio }) {
  const ownedItems = SHOP_ITEMS.filter((item) => pet.ownedItems.includes(item.id));

  const equip = (item) => {
    audio.click();
    setPet((p) => ({
      ...p,
      equipped: { ...p.equipped, [item.type]: p.equipped[item.type] === item.id ? null : item.id }
    }));
  };

  return (
    <Shell title="Vestidor" onBack={onBack} audio={audio} pet={pet}>
      <div className="shop-layout">
        <div className="preview-card">
          <DamigotchiAvatar pet={pet} />
          <p className="hint">Toca una prenda para ponerla o quitarla.</p>
        </div>

        {ownedItems.length === 0 ? (
          <div className="question-card">
            <h2>Aún no tienes ropita</h2>
            <p>Juega para ganar estrellas y comprar en la tienda.</p>
          </div>
        ) : (
          <div className="shop-grid">
            {ownedItems.map((item) => (
              <button key={item.id} className={`shop-item ${pet.equipped[item.type] === item.id ? "equipped" : ""}`} onClick={() => equip(item)}>
                <div className="item-emoji">{item.emoji}</div>
                <div className="item-name">{item.name}</div>
                <div className="item-color" style={{ background: item.color }} />
                <div className="item-price">{pet.equipped[item.type] === item.id ? "Puesto ✅" : "Poner"}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
