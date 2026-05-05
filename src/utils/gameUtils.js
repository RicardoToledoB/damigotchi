export function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function calculateLevel(totalStars) {
  return 1 + Math.floor(totalStars / 10);
}
