import { useState } from "react";
import Shell from "../components/Shell";
import { WORDS } from "../data/gameData";
import { randomFrom } from "../utils/gameUtils";

export default function WordsPage({ onBack, onWin, audio, pet }) {
  const [question, setQuestion] = useState(() => randomFrom(WORDS));
  const [feedback, setFeedback] = useState("");

  const choose = (word) => {
    if (word === question.word) {
      audio.correct();
      setFeedback("¡Correcto! Ganaste ⭐");
      onWin("palabras");
      setTimeout(() => {
        setQuestion(randomFrom(WORDS));
        setFeedback("");
      }, 900);
    } else {
      audio.wrong();
      setFeedback(`Era ${question.word}`);
    }
  };

  return (
    <Shell title="Palabras" onBack={onBack} audio={audio} pet={pet}>
      <div className="question-card">
        <div className="emoji-big">{question.emoji}</div>
        <h2>¿Cómo se llama?</h2>
        <div className="answers column">
          {question.options.map((option) => <button key={option} onClick={() => choose(option)}>{option}</button>)}
        </div>
        {feedback && <div className="feedback">{feedback}</div>}
      </div>
    </Shell>
  );
}
