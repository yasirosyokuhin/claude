// Joker definitions. Each joker has a `hook`:
//   'card' -> onCardScored(ctx, card, gameState) -> {chips, mult}
//   'hand' -> onHandScored(ctx, info) -> {chips, mult}   info: {type, playedCards, scoringCards, heldCards, gameState}
//   'roundEnd' -> onRoundEnd(gameState) -> {money, message}
// Structural flags (checked directly by other modules): freeFirstReroll

import { suitInfo } from './cards.js';

const CONTAINS = {
  pair: ['pair', 'two_pair', 'three_kind', 'full_house', 'four_kind'],
  two_pair: ['two_pair', 'full_house'],
  three_kind: ['three_kind', 'full_house', 'four_kind'],
  straight: ['straight', 'straight_flush'],
  flush: ['flush', 'straight_flush'],
};

export function containsHandType(actualType, target) {
  return (CONTAINS[target] || [target]).includes(actualType);
}

function suitJoker(id, name, suitId, cost) {
  return {
    id,
    name,
    desc: `${suitInfo(suitId).symbol}のカードがスコアするたびに +3マルト`,
    cost,
    rarity: 'common',
    hook: 'card',
    onCardScored(ctx, card) {
      if (card.suit === suitId || card.enhancement === 'wild') {
        return { chips: ctx.chips, mult: ctx.mult + 3 };
      }
      return ctx;
    },
  };
}

export const JOKER_DEFS = [
  {
    id: 'joker_basic',
    name: 'ジョーカー',
    desc: '+4マルト',
    cost: 2,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx) {
      return { chips: ctx.chips, mult: ctx.mult + 4 };
    },
  },
  suitJoker('joker_greedy', '強欲なジョーカー', 'D', 5),
  suitJoker('joker_lusty', '色欲なジョーカー', 'H', 5),
  suitJoker('joker_wrathful', '憤怒のジョーカー', 'S', 5),
  suitJoker('joker_gluttonous', '大食いのジョーカー', 'C', 5),
  {
    id: 'joker_sly',
    name: 'ずる賢いジョーカー',
    desc: 'ツーペア以上の役で +80チップ',
    cost: 4,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx, info) {
      if (containsHandType(info.type, 'two_pair')) return { chips: ctx.chips + 80, mult: ctx.mult };
      return ctx;
    },
  },
  {
    id: 'joker_jolly',
    name: '陽気なジョーカー',
    desc: 'ワンペア以上の役で +8マルト',
    cost: 3,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx, info) {
      if (containsHandType(info.type, 'pair')) return { chips: ctx.chips, mult: ctx.mult + 8 };
      return ctx;
    },
  },
  {
    id: 'joker_zany',
    name: '狂気のジョーカー',
    desc: 'スリーカード以上の役で +10マルト',
    cost: 4,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx, info) {
      if (containsHandType(info.type, 'three_kind')) return { chips: ctx.chips, mult: ctx.mult + 10 };
      return ctx;
    },
  },
  {
    id: 'joker_misprint',
    name: 'ミスプリント',
    desc: '+0〜+23のランダムなマルト',
    cost: 4,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx) {
      return { chips: ctx.chips, mult: ctx.mult + Math.floor(Math.random() * 24) };
    },
  },
  {
    id: 'joker_banner',
    name: 'バナー',
    desc: '残りディスカード1回につき +30チップ',
    cost: 5,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx, info) {
      return { chips: ctx.chips + 30 * info.gameState.discardsLeft, mult: ctx.mult };
    },
  },
  {
    id: 'joker_mystic',
    name: '神秘の頂',
    desc: 'ディスカード残り0のとき +15マルト',
    cost: 5,
    rarity: 'common',
    hook: 'hand',
    onHandScored(ctx, info) {
      if (info.gameState.discardsLeft === 0) return { chips: ctx.chips, mult: ctx.mult + 15 };
      return ctx;
    },
  },
  {
    id: 'joker_photograph',
    name: '写真',
    desc: 'このハンドで最初にスコアした絵札(J/Q/K)のマルトを x2',
    cost: 5,
    rarity: 'common',
    hook: 'card',
    onCardScored(ctx, card, gameState) {
      if (card.rank >= 11 && card.rank <= 13 && !gameState.transient.photoUsed) {
        gameState.transient.photoUsed = true;
        return { chips: ctx.chips, mult: ctx.mult * 2 };
      }
      return ctx;
    },
  },
  {
    id: 'joker_blackboard',
    name: 'ブラックボード',
    desc: '手札に残った(プレイしなかった)カードが全て♠か♣なら x3マルト',
    cost: 6,
    rarity: 'uncommon',
    hook: 'hand',
    onHandScored(ctx, info) {
      const held = info.heldCards;
      if (held.length > 0 && held.every((c) => c.suit === 'S' || c.suit === 'C')) {
        return { chips: ctx.chips, mult: ctx.mult * 3 };
      }
      return ctx;
    },
  },
  {
    id: 'joker_campaign',
    name: 'キャンペーン',
    desc: 'ブラインド勝利時、残っているハンド回数につき +$1',
    cost: 4,
    rarity: 'uncommon',
    hook: 'roundEnd',
    onRoundEnd(gameState) {
      const amt = gameState.handsLeft;
      if (amt > 0) return { money: amt, message: `キャンペーン: +$${amt}` };
      return null;
    },
  },
  {
    id: 'joker_dice',
    name: 'サイコロ',
    desc: 'ショップの最初のリロールが無料',
    cost: 6,
    rarity: 'uncommon',
    hook: 'passive',
    freeFirstReroll: true,
  },
  {
    id: 'joker_hologram',
    name: 'ホログラム',
    desc: '所持しているジョーカー1枚につき +4マルト(自身を含む)',
    cost: 7,
    rarity: 'rare',
    hook: 'hand',
    onHandScored(ctx, info) {
      const count = info.gameState.jokers.length;
      return { chips: ctx.chips, mult: ctx.mult + 4 * count };
    },
  },
  {
    id: 'joker_cavendish',
    name: 'カベンディッシュ',
    desc: 'x3マルト',
    cost: 6,
    rarity: 'rare',
    hook: 'hand',
    onHandScored(ctx) {
      return { chips: ctx.chips, mult: ctx.mult * 3 };
    },
  },
];

export const RARITY_WEIGHTS = { common: 70, uncommon: 25, rare: 8 };

export function getJokerDef(id) {
  return JOKER_DEFS.find((j) => j.id === id);
}

export function instantiateJoker(id) {
  const def = getJokerDef(id);
  return { ...def, instanceId: `${id}_${Math.random().toString(36).slice(2, 9)}` };
}

export function randomJokerId(excludeIds = []) {
  const pool = JOKER_DEFS.filter((j) => !excludeIds.includes(j.id));
  const total = pool.reduce((sum, j) => sum + (RARITY_WEIGHTS[j.rarity] || 10), 0);
  let r = Math.random() * total;
  for (const j of pool) {
    r -= RARITY_WEIGHTS[j.rarity] || 10;
    if (r <= 0) return j.id;
  }
  return pool[pool.length - 1]?.id;
}
