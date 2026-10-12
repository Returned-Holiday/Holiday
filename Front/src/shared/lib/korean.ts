const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

type Particle = { batchim: string; plain: string; unknown: string };

export const PARTICLE_OR: Particle = { batchim: "이나", plain: "나", unknown: "(이)나" };
export const PARTICLE_TOPIC: Particle = { batchim: "은", plain: "는", unknown: "은(는)" };

// 받침 유무로 조사 선택 (한글 아닌 끝 글자 → 병기)
export function withParticle(word: string, particle: Particle): string {
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < HANGUL_START || code > HANGUL_END) {
    return `${word}${particle.unknown}`;
  }
  return `${word}${(code - HANGUL_START) % 28 === 0 ? particle.plain : particle.batchim}`;
}
