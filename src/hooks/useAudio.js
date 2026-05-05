import { useRef, useState } from "react";

export function useAudio() {
  const ctxRef = useRef(null);
  const [enabled, setEnabled] = useState(true);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const beep = (freq = 600, duration = 0.12, type = "sine") => {
    if (!enabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const correct = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 70));
  const wrong = () => beep(180, 0.28, "sawtooth");
  const click = () => beep(750, 0.07);
  const buy = () => [784, 1047, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.10), i * 80));

  return { enabled, setEnabled, correct, wrong, click, buy };
}
