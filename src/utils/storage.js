export function loadSavedPet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    return {
      ...fallback,
      ...saved,
      needs: { ...fallback.needs, ...(saved.needs || {}) },
      equipped: { ...fallback.equipped, ...(saved.equipped || {}) },
      ownedItems: Array.isArray(saved.ownedItems) ? saved.ownedItems : []
    };
  } catch {
    return fallback;
  }
}

export function savePet(key, pet) {
  localStorage.setItem(key, JSON.stringify(pet));
}
