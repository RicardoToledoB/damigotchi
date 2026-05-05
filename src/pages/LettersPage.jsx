import { useState } from "react";
import Shell from "../components/Shell";
import { LETTERS } from "../data/gameData";
import { randomFrom } from "../utils/gameUtils";

export default function LettersPage({ onBack, onWin, audio, pet }) {
  const [item, setItem] = useState(() => randomFrom(LETTERS));
  const [revealed, setRevealed] = useState(false);

  const next = () => {
    audio.correct();
    onWin("letras");
    setRevealed(false);
    setItem(randomFrom(LETTERS));
  };

  return (
    <Shell title="Letras" onBack={onBack} audio={audio} pet={pet}>
      <div className="question-card">
        <div className="emoji-big">{item[2]}</div>
        <div className="letter-big">{item[0]}</div>
        {revealed ? <h2>{item[1]}</h2> : <button className="primary" onClick={() => { audio.click(); setRevealed(true); }}>Ver palabra</button>}
        {revealed && <button className="primary" onClick={next}>Siguiente ⭐</button>}
      </div>
    </Shell>
  );
}
