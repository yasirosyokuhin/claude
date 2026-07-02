// Card definitions, deck creation, chip values

export const SUITS = [
  { id: 'S', name: 'スペード', symbol: '♠', color: 'black' },
  { id: 'H', name: 'ハート', symbol: '♥', color: 'red' },
  { id: 'D', name: 'ダイヤ', symbol: '♦', color: 'red' },
  { id: 'C', name: 'クラブ', symbol: '♣', color: 'black' },
];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function rankLabel(rank) {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function chipValue(rank) {
  if (rank === 14) return 11;
  if (rank >= 11) return 10;
  return rank;
}

export const ENHANCEMENTS = {
  none: { id: 'none', name: '', desc: '' },
  bonus: { id: 'bonus', name: 'ボーナスカード', desc: 'スコア時に+30チップ' },
  mult: { id: 'mult', name: 'マルトカード', desc: 'スコア時に+4マルト' },
  wild: { id: 'wild', name: 'ワイルドカード', desc: '全てのスートとして扱われる' },
  glass: { id: 'glass', name: 'グラスカード', desc: 'スコア時にx2マルト。1/4の確率で消滅する' },
  steel: { id: 'steel', name: 'スチールカード', desc: '手札にある間、x1.5マルト' },
  stone: { id: 'stone', name: 'ストーンカード', desc: 'ランク/スートを持たず、常に+50チップ' },
};

let cardIdCounter = 1;

export function makeCard(rank, suit) {
  return {
    id: cardIdCounter++,
    rank,
    suit,
    enhancement: 'none',
    seal: null,
    selected: false,
    debuffed: false,
  };
}

export function createStandardDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit.id));
    }
  }
  return deck;
}

export function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function suitInfo(id) {
  return SUITS.find((s) => s.id === id);
}
