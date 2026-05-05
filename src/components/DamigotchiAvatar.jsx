import { SHOP_ITEMS } from "../data/shopItems";

function getItem(id) {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export default function DamigotchiAvatar({ pet, size = "big" }) {
  const mood = pet.energy > 75 ? "happy" : pet.energy > 45 ? "normal" : "sad";
  const hat = getItem(pet.equipped.hat);
  const shirt = getItem(pet.equipped.shirt);
  const glasses = getItem(pet.equipped.glasses);
  const accessory = getItem(pet.equipped.accessory);

  return (
    <div className={`damigo ${size}`} aria-label="Mascota Damigotchi">
      <div className="ears"><span /><span /></div>
      {hat && <div className={hat.crown ? "crown" : "hat"} style={{ background: hat.color }}>{hat.crown ? "♛" : ""}</div>}
      {accessory && <div className="bow" style={{ background: accessory.color }} />}
      <div className="face">
        <div className="eyes"><span /><span /></div>
        {glasses && <div className="glasses" style={{ borderColor: glasses.color }}><span /><span /></div>}
        <div className={`mouth ${mood}`} />
      </div>
      <div className="body">{shirt && <div className="shirt" style={{ background: shirt.color }} />}</div>
    </div>
  );
}
