// Tarot cards (card enhancers) and Planet cards (hand level-ups)

import { HAND_TYPES } from './hands.js';

export const TAROT_DEFS = [
  {
    id: 'tarot_magician',
    name: '魔術師',
    kind: 'tarot',
    cost: 3,
    desc: '選択した1枚のカードをボーナスカードにする(+30チップ)',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.enhancement = 'bonus'));
    },
  },
  {
    id: 'tarot_empress',
    name: '女帝',
    kind: 'tarot',
    cost: 3,
    desc: '選択した1枚のカードをマルトカードにする(+4マルト)',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.enhancement = 'mult'));
    },
  },
  {
    id: 'tarot_lovers',
    name: '恋人',
    kind: 'tarot',
    cost: 3,
    desc: '選択した1枚のカードをワイルドカードにする(全スート扱い)',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.enhancement = 'wild'));
    },
  },
  {
    id: 'tarot_chariot',
    name: '戦車',
    kind: 'tarot',
    cost: 4,
    desc: '選択した1枚のカードをスチールカードにする(手札保持でx1.5マルト)',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.enhancement = 'steel'));
    },
  },
  {
    id: 'tarot_devil',
    name: '悪魔',
    kind: 'tarot',
    cost: 4,
    desc: '選択した1枚のカードをグラスカードにする(x2マルト、たまに消滅)',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.enhancement = 'glass'));
    },
  },
  {
    id: 'tarot_tower',
    name: '塔',
    kind: 'tarot',
    cost: 3,
    desc: '選択した1枚のカードをストーンカードにする(ランク/スートなし、常に+50チップ)',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.enhancement = 'stone'));
    },
  },
  {
    id: 'tarot_death',
    name: '死神',
    kind: 'tarot',
    cost: 5,
    desc: '選択した2枚のカードのうち、左のカードを右のカードの複製に変える',
    selectCount: 2,
    apply(cards) {
      const [left, right] = cards;
      left.rank = right.rank;
      left.suit = right.suit;
      left.enhancement = right.enhancement;
    },
  },
  {
    id: 'tarot_sun',
    name: '太陽',
    kind: 'tarot',
    cost: 3,
    desc: '選択した1枚のカードをハートに変える',
    selectCount: 1,
    apply(cards) {
      cards.forEach((c) => (c.suit = 'H'));
    },
  },
];

export const PLANET_DEFS = Object.entries(HAND_TYPES).map(([type, info]) => ({
  id: `planet_${type}`,
  name: info.planet,
  kind: 'planet',
  cost: 3,
  desc: `${info.name}のレベルを+1する`,
  handType: type,
}));

export function getConsumableDef(id) {
  return TAROT_DEFS.find((t) => t.id === id) || PLANET_DEFS.find((p) => p.id === id);
}

export function randomTarotId() {
  return TAROT_DEFS[Math.floor(Math.random() * TAROT_DEFS.length)].id;
}

export function randomPlanetId() {
  return PLANET_DEFS[Math.floor(Math.random() * PLANET_DEFS.length)].id;
}
