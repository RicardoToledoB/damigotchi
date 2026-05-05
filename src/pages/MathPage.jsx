import { useState } from "react";
import Shell from "../components/Shell";
import { shuffle } from "../utils/gameUtils";

function makeQuestion(type) {
  let a = Math.ceil(Math.random() * 6);
  let b = Math.ceil(Math.random() * 6);
  if (type === "restas" && b > a) [a, b] = [b, a];
  const answer = type === "sumas" ? a + b : a - b;
  const options = shuffle([...new Set([answer, Math.max(0, answer + 1), Math.max(0, answer - 1), answer + 2])]).slice(0, 4);
  return { a, b, answer, options };
}

export default function MathPage({ type, onBack, onWin, audio, pet }) {
  const [question, setQuestion] = useState(() => makeQuestion(type));
  const [feedback, setFeedback] = useState("");

  const choose = (value) => {
    if (value === question.answer) {
      audio.correct();
      setFeedback("¡Muy bien! Ganaste ⭐");
      onWin(type);
      setTimeout(() => {
        setQuestion(makeQuestion(type));
        setFeedback("");
      }, 900);
    } else {
      audio.wrong();
      setFeedback(`Era ${question.answer}. Inténtalo de nuevo 💪`);
    }
  };

  return (
    <Shell title={type === "sumas" ? "Sumas" : "Restas"} onBack={onBack} audio={audio} pet={pet}>
      <div className="question-card">
        <div className="big-question">{question.a} {type === "sumas" ? "+" : "-"} {question.b} = ?</div>
        <div className="answers">
          {question.options.map((option) => <button key={option} onClick={() => choose(option)}>{option}</button>)}
        </div>
        {feedback && <div className="feedback">{feedback}</div>}
      </div>
    </Shell>
  );
}
