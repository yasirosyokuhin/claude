// Poker hand evaluation and hand-level (Planet card) tables

export const HAND_TYPE_ORDER = [
  'straight_flush',
  'four_kind',
  'full_house',
  'flush',
  'straight',
  'three_kind',
  'two_pair',
  'pair',
  'high_card',
];

export const HAND_TYPES = {
  high_card: { name: 'ハイカード', chips: 5, mult: 1, chips_inc: 10, mult_inc: 1, planet: '冥王星' },
  pair: { name: 'ワンペア', chips: 10, mult: 2, chips_inc: 15, mult_inc: 1, planet: '水星' },
  two_pair: { name: 'ツーペア', chips: 20, mult: 2, chips_inc: 20, mult_inc: 1, planet: '天王星' },
  three_kind: { name: 'スリーカード', chips: 30, mult: 3, chips_inc: 20, mult_inc: 2, planet: '金星' },
  straight: { name: 'ストレート', chips: 30, mult: 4, chips_inc: 30, mult_inc: 3, planet: '土星' },
  flush: { name: 'フラッシュ', chips: 35, mult: 4, chips_inc: 15, mult_inc: 2, planet: '木星' },
  full_house: { name: 'フルハウス', chips: 40, mult: 4, chips_inc: 25, mult_inc: 2, planet: '地球' },
  four_kind: { name: 'フォーカード', chips: 60, mult: 7, chips_inc: 30, mult_inc: 3, planet: '火星' },
  straight_flush: { name: 'ストレートフラッシュ', chips: 100, mult: 8, chips_inc: 40, mult_inc: 4, planet: '海王星' },
};

export function initHandLevels() {
  const levels = {};
  for (const type of Object.keys(HAND_TYPES)) levels[type] = 1;
  return levels;
}

export function getHandStats(type, level) {
  const base = HAND_TYPES[type];
  const lvl = Math.max(1, level || 1);
  return {
    chips: base.chips + base.chips_inc * (lvl - 1),
    mult: base.mult + base.mult_inc * (lvl - 1),
  };
}

export function cardSuitMatches(card, suitId) {
  return card.enhancement === 'wild' || card.suit === suitId;
}

function computeFlush(nonStoneCards) {
  if (nonStoneCards.length !== 5) return false;
  for (const suit of ['S', 'H', 'D', 'C']) {
    if (nonStoneCards.every((c) => cardSuitMatches(c, suit))) return true;
  }
  return false;
}

function computeStraight(nonStoneCards) {
  if (nonStoneCards.length !== 5) return false;
  const ranks = [...new Set(nonStoneCards.map((c) => c.rank))];
  if (ranks.length !== 5) return false;
  ranks.sort((a, b) => a - b);
  if (ranks[4] - ranks[0] === 4) return true;
  // Ace-low straight: A,2,3,4,5
  if (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5 && ranks[4] === 14) return true;
  return false;
}

// cards: array of 1-5 Card objects selected/played by the player.
// Returns { type, scoringCards } where scoringCards is the subset of `cards`
// that actually contributes to the score (glows in the UI).
export function evaluateHand(cards) {
  const nonStone = cards.filter((c) => c.enhancement !== 'stone');
  const stoneCards = cards.filter((c) => c.enhancement === 'stone');

  const rankGroups = new Map();
  for (const c of nonStone) {
    if (!rankGroups.has(c.rank)) rankGroups.set(c.rank, []);
    rankGroups.get(c.rank).push(c);
  }
  const groups = [...rankGroups.values()].sort(
    (a, b) => b.length - a.length || b[0].rank - a[0].rank
  );
  const groupSizes = groups.map((g) => g.length);

  const isFlush = computeFlush(nonStone);
  const isStraight = computeStraight(nonStone);

  let type;
  let scoringNonStone;

  if (isFlush && isStraight) {
    type = 'straight_flush';
    scoringNonStone = nonStone;
  } else if (groupSizes[0] === 4) {
    type = 'four_kind';
    scoringNonStone = groups[0];
  } else if (groupSizes[0] === 3 && groupSizes[1] === 2) {
    type = 'full_house';
    scoringNonStone = [...groups[0], ...groups[1]];
  } else if (isFlush) {
    type = 'flush';
    scoringNonStone = nonStone;
  } else if (isStraight) {
    type = 'straight';
    scoringNonStone = nonStone;
  } else if (groupSizes[0] === 3) {
    type = 'three_kind';
    scoringNonStone = groups[0];
  } else if (groupSizes[0] === 2 && groupSizes[1] === 2) {
    type = 'two_pair';
    scoringNonStone = [...groups[0], ...groups[1]];
  } else if (groupSizes[0] === 2) {
    type = 'pair';
    scoringNonStone = groups[0];
  } else {
    type = 'high_card';
    if (nonStone.length) {
      const highest = nonStone.reduce((a, b) => (b.rank > a.rank ? b : a));
      scoringNonStone = [highest];
    } else {
      scoringNonStone = [];
    }
  }

  return { type, scoringCards: [...scoringNonStone, ...stoneCards] };
}
