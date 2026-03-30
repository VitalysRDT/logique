const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
  }
  return code;
}
