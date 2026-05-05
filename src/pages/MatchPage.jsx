import { useState } from "react";
import Shell from "../components/Shell";
import { MATCHES } from "../data/gameData";
import { shuffle } from "../utils/gameUtils";

export default function MatchPage({ onBack, onWin, audio, pet }) {
  const [leftItems, setLeftItems] = useState(() => shuffle(MATCHES));
  const [rightItems, setRightItems] = useState(() => shuffle(MATCHES));
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState([]);

  const reset = () => {
    setLeftItems(shuffle(MATCHES));
    setRightItems(shuffle(MATCHES));
    setSelected(null);
    setDone([]);
  };

  const pickRight = (right) => {
    if (!selected) return;
    if (selected.right === right.right) {
      audio.correct();
      const nextDone = [...done, selected.left];
      setDone(nextDone);
      if (nextDone.length === MATCHES.length) {
        onWin("unir");
        setTimeout(reset, 900);
      }
    } else {
      audio.wrong();
    }
    setSelected(null);
  };

  return (
    <Shell title="Unir pares" onBack={onBack} audio={audio} pet={pet}>
      <div className="match-grid">
        <div>{leftItems.map((item) => <button key={item.left} disabled={done.includes(item.left)} className={selected?.left === item.left ? "selected" : ""} onClick={() => setSelected(item)}>{item.left}</button>)}</div>
        <div>{rightItems.map((item) => <button key={item.right} onClick={() => pickRight(item)}>{item.right}</button>)}</div>
      </div>
      <p className="hint">Toca un número y luego su palabra.</p>
    </Shell>
  );
}
