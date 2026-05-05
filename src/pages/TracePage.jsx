import { useState } from "react";
import Shell from "../components/Shell";
import { TRACE_LETTERS } from "../data/gameData";

export default function TracePage({ onBack, onWin, audio, pet }) {
  const [index, setIndex] = useState(0);
  const letter = TRACE_LETTERS[index];

  const next = () => {
    audio.correct();
    onWin("trazar");
    setIndex((current) => (current + 1) % TRACE_LETTERS.length);
  };

  return (
    <Shell title="Trazar letras" onBack={onBack} audio={audio} pet={pet}>
      <div className="trace-card">
        <div className="trace-letter">{letter}</div>
        <p>Pasa tu dedo sobre la letra.</p>
        <button className="primary" onClick={next}>Listo ⭐</button>
      </div>
    </Shell>
  );
}
