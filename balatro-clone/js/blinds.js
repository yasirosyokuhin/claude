// Ante / Blind requirements and boss blind effects

export const BASE_SCORES = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];
export const MAX_ANTE = 8;

export const BLIND_KINDS = [
  { key: 'small', name: 'スモールブラインド', mult: 1, reward: 3 },
  { key: 'big', name: 'ビッグブラインド', mult: 1.5, reward: 4 },
  { key: 'boss', name: 'ボスブラインド', mult: 2, reward: 5 },
];

export const BOSS_EFFECTS = [
  { id: 'boss_hook', name: '鉤爪', desc: 'すべての♥が無効化される', type: 'debuff_suit', suit: 'H' },
  { id: 'boss_water', name: '水', desc: 'ディスカード0回からスタート', type: 'no_discards' },
  { id: 'boss_window', name: '窓', desc: 'すべての♦が無効化される', type: 'debuff_suit', suit: 'D' },
  { id: 'boss_neck', name: '首', desc: 'すべての♠が無効化される', type: 'debuff_suit', suit: 'S' },
  { id: 'boss_manacle', name: 'マニキュア', desc: '手札が1枚少ない', type: 'smaller_hand' },
  { id: 'boss_needle', name: '針', desc: 'ハンドは1回のみ', type: 'one_hand' },
];

export function getBlindRequirement(ante, blindKey) {
  const base = BASE_SCORES[ante - 1];
  const kind = BLIND_KINDS.find((k) => k.key === blindKey);
  return Math.round(base * kind.mult);
}

export function getBlindReward(blindKey) {
  return BLIND_KINDS.find((k) => k.key === blindKey).reward;
}

export function randomBossEffect() {
  return BOSS_EFFECTS[Math.floor(Math.random() * BOSS_EFFECTS.length)];
}
