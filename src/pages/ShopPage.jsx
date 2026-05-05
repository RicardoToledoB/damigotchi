import Shell from "../components/Shell";
import DamigotchiAvatar from "../components/DamigotchiAvatar";
import { SHOP_ITEMS } from "../data/shopItems";

export default function ShopPage({ pet, setPet, onBack, audio }) {
  const buyItem = (item) => {
    if (pet.ownedItems.includes(item.id)) return;
    if (pet.level < item.level || pet.stars < item.price) {
      audio.wrong();
      return;
    }

    audio.buy();
    setPet((p) => ({
      ...p,
      stars: p.stars - item.price,
      ownedItems: [...p.ownedItems, item.id],
      equipped: { ...p.equipped, [item.type]: item.id }
    }));
  };

  return (
    <Shell title="Tienda" onBack={onBack} audio={audio} pet={pet}>
      <div className="shop-layout">
        <div className="preview-card">
          <DamigotchiAvatar pet={pet} />
          <div className="level-pill">Tus estrellas: ⭐ {pet.stars}</div>
          <p className="hint">Compra ropita y se equipa automáticamente.</p>
        </div>

        <div className="shop-grid">
          {SHOP_ITEMS.map((item) => {
            const owned = pet.ownedItems.includes(item.id);
            const locked = pet.level < item.level;
            const poor = pet.stars < item.price && !owned;
            return (
              <button key={item.id} className={`shop-item ${owned ? "owned" : ""} ${locked ? "locked" : ""}`} onClick={() => buyItem(item)}>
                <div className="item-emoji">{item.emoji}</div>
                <div className="item-name">{item.name}</div>
                <div className="item-color" style={{ background: item.color }} />
                <div className="item-price">{owned ? "Comprado ✅" : locked ? `Nivel ${item.level} 🔒` : `⭐ ${item.price}`}</div>
                {poor && !locked && <small>Te faltan estrellas</small>}
              </button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
