// Game state machine

import { createStandardDeck, shuffle } from './cards.js';
import { evaluateHand, initHandLevels } from './hands.js';
import { computeScore } from './scoring.js';
import { BLIND_KINDS, MAX_ANTE, getBlindRequirement, getBlindReward, randomBossEffect } from './blinds.js';
import { instantiateJoker, getJokerDef, randomJokerId } from './jokers.js';
import { getConsumableDef, randomTarotId, randomPlanetId } from './consumables.js';

export function createNewGame() {
  const state = {
    screen: 'blind',
    money: 4,
    ante: 1,
    blindIndex: 0,
    ownedDeck: createStandardDeck(),
    drawPile: [],
    hand: [],
    discardsLeft: 3,
    handsLeft: 4,
    maxHands: 4,
    maxDiscards: 3,
    handSize: 8,
    sortMode: 'rank',
    jokers: [],
    jokerSlots: 5,
    consumables: [],
    consumableSlots: 2,
    handLevels: initHandLevels(),
    currentBlindScore: 0,
    blindRequirement: getBlindRequirement(1, 'small'),
    bossEffect: null,
    shop: null,
    transient: {},
    lastScoreResult: null,
    lastRoundReward: null,
    gameOverReason: null,
    message: null,
  };
  return state;
}

export function currentBlindKind(state) {
  return BLIND_KINDS[state.blindIndex].key;
}

export function goToBlindScreen(state) {
  const key = currentBlindKind(state);
  state.bossEffect = key === 'boss' ? randomBossEffect() : null;
  state.blindRequirement = getBlindRequirement(state.ante, key);
  state.screen = 'blind';
  state.lastRoundReward = null;
}

export function startRound(state) {
  state.maxHands = 4;
  state.maxDiscards = 3;
  state.handSize = 8;
  if (state.bossEffect) {
    if (state.bossEffect.type === 'no_discards') state.maxDiscards = 0;
    if (state.bossEffect.type === 'smaller_hand') state.handSize = 7;
    if (state.bossEffect.type === 'one_hand') state.maxHands = 1;
  }
  state.handsLeft = state.maxHands;
  state.discardsLeft = state.maxDiscards;
  state.currentBlindScore = 0;
  for (const c of state.ownedDeck) c.selected = false;
  state.drawPile = shuffle(state.ownedDeck);
  state.hand = state.drawPile.splice(0, state.handSize);
  sortHand(state, state.sortMode);
  state.lastScoreResult = null;
  state.message = null;
  state.screen = 'playing';
}

export function toggleCardSelection(state, cardId) {
  const card = state.hand.find((c) => c.id === cardId);
  if (!card) return;
  if (!card.selected) {
    const selectedCount = state.hand.filter((c) => c.selected).length;
    if (selectedCount >= 5) return;
  }
  card.selected = !card.selected;
}

function refillHand(state, n) {
  const draw = state.drawPile.splice(0, n);
  state.hand.push(...draw);
  sortHand(state, state.sortMode);
}

export function playHand(state) {
  const selected = state.hand.filter((c) => c.selected);
  if (selected.length < 1 || selected.length > 5) return { error: '1〜5枚選択してください' };

  const { type, scoringCards } = evaluateHand(selected);
  const heldCards = state.hand.filter((c) => !c.selected);
  state.transient = {};
  const level = state.handLevels[type];

  const result = computeScore({
    type,
    level,
    scoringCards,
    playedCards: selected,
    heldCards,
    jokers: state.jokers,
    bossEffect: state.bossEffect,
    gameState: state,
  });

  state.currentBlindScore += result.total;
  state.handsLeft -= 1;
  state.lastScoreResult = { ...result, type };

  if (result.brokenGlassIds.length) {
    state.ownedDeck = state.ownedDeck.filter((c) => !result.brokenGlassIds.includes(c.id));
  }

  const playedIds = new Set(selected.map((c) => c.id));
  state.hand = state.hand.filter((c) => !playedIds.has(c.id));
  refillHand(state, selected.length);

  if (state.currentBlindScore >= state.blindRequirement) {
    beatBlind(state);
  } else if (state.handsLeft <= 0) {
    state.screen = 'gameover';
    state.gameOverReason = `${BLIND_KINDS[state.blindIndex].name}を突破できませんでした(スコア ${state.currentBlindScore} / ${state.blindRequirement})`;
  }

  return result;
}

export function discardHand(state) {
  const selected = state.hand.filter((c) => c.selected);
  if (selected.length < 1 || selected.length > 5) return { error: '1〜5枚選択してください' };
  if (state.discardsLeft <= 0) return { error: 'ディスカード回数がありません' };

  state.discardsLeft -= 1;
  const selectedIds = new Set(selected.map((c) => c.id));
  state.hand = state.hand.filter((c) => !selectedIds.has(c.id));
  refillHand(state, selected.length);
  return {};
}

export function sortHand(state, mode) {
  state.sortMode = mode;
  if (mode === 'rank') {
    state.hand.sort((a, b) => b.rank - a.rank);
  } else {
    const order = { S: 0, H: 1, D: 2, C: 3 };
    state.hand.sort((a, b) => order[a.suit] - order[b.suit] || b.rank - a.rank);
  }
}

function beatBlind(state) {
  const key = currentBlindKind(state);
  const baseReward = getBlindReward(key);
  const handBonus = state.handsLeft;
  const interest = Math.min(5, Math.floor(state.money / 5));
  let total = baseReward + handBonus + interest;
  const messages = [`ブラインド報酬 +$${baseReward}`, `残りハンドボーナス +$${handBonus}`, `利子 +$${interest}`];

  for (const joker of state.jokers) {
    if (joker.hook === 'roundEnd') {
      const r = joker.onRoundEnd(state);
      if (r) {
        total += r.money;
        messages.push(r.message);
      }
    }
  }

  state.money += total;
  state.lastRoundReward = { total, messages };

  if (state.blindIndex === 2) {
    if (state.ante >= MAX_ANTE) {
      state.screen = 'win';
      return;
    }
    state.ante += 1;
    state.blindIndex = 0;
  } else {
    state.blindIndex += 1;
  }

  generateShop(state);
  state.screen = 'shop';
}

// ---- Shop ----

function makeShopItems(state, count = 2) {
  const items = [];
  const excludeJokerIds = state.jokers.map((j) => j.id);
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    if (roll < 0.6) {
      const id = randomJokerId(excludeJokerIds.concat(items.filter((it) => it.type === 'joker').map((it) => it.refId)));
      if (id) {
        const def = getJokerDef(id);
        items.push({ type: 'joker', refId: id, name: def.name, desc: def.desc, cost: def.cost });
        continue;
      }
    }
    if (roll < 0.85) {
      const id = randomTarotId();
      const def = getConsumableDef(id);
      items.push({ type: 'tarot', refId: id, name: def.name, desc: def.desc, cost: def.cost });
    } else {
      const id = randomPlanetId();
      const def = getConsumableDef(id);
      items.push({ type: 'planet', refId: id, name: def.name, desc: def.desc, cost: def.cost });
    }
  }
  return items;
}

export function generateShop(state) {
  state.shop = {
    items: makeShopItems(state),
    rerollCost: 5,
    freeRerollUsed: false,
  };
}

export function rerollShop(state) {
  const hasFreeReroll = state.jokers.some((j) => j.freeFirstReroll);
  const free = hasFreeReroll && !state.shop.freeRerollUsed;
  const cost = free ? 0 : state.shop.rerollCost;
  if (!free && state.money < cost) return { error: '所持金が足りません' };
  if (free) {
    state.shop.freeRerollUsed = true;
  } else {
    state.money -= cost;
    state.shop.rerollCost += 1;
  }
  state.shop.items = makeShopItems(state);
  return {};
}

export function buyItem(state, index) {
  const item = state.shop.items[index];
  if (!item) return { error: '売り切れです' };
  if (state.money < item.cost) return { error: '所持金が足りません' };

  if (item.type === 'joker') {
    if (state.jokers.length >= state.jokerSlots) return { error: 'ジョーカー枠が満杯です' };
    state.money -= item.cost;
    state.jokers.push(instantiateJoker(item.refId));
  } else {
    if (state.consumables.length >= state.consumableSlots) return { error: 'アイテム枠が満杯です' };
    state.money -= item.cost;
    const def = getConsumableDef(item.refId);
    state.consumables.push({ ...def, instanceId: `${item.refId}_${Math.random().toString(36).slice(2, 9)}` });
  }
  state.shop.items[index] = null;
  return {};
}

export function sellJoker(state, instanceId) {
  const idx = state.jokers.findIndex((j) => j.instanceId === instanceId);
  if (idx < 0) return { error: 'ジョーカーが見つかりません' };
  const j = state.jokers[idx];
  const refund = Math.ceil(j.cost / 2);
  state.money += refund;
  state.jokers.splice(idx, 1);
  return { refund };
}

export function useConsumable(state, instanceId, selectedCardIds = []) {
  const idx = state.consumables.findIndex((c) => c.instanceId === instanceId);
  if (idx < 0) return { error: 'アイテムが見つかりません' };
  const item = state.consumables[idx];

  if (item.kind === 'planet') {
    state.handLevels[item.handType] += 1;
    state.consumables.splice(idx, 1);
    return { message: `${item.name}: 役レベルアップ!` };
  }

  // tarot
  if (selectedCardIds.length !== item.selectCount) {
    return { error: `${item.selectCount}枚のカードを選択してください` };
  }
  const cards = selectedCardIds.map((id) => state.hand.find((c) => c.id === id)).filter(Boolean);
  if (cards.length !== item.selectCount) return { error: '手札からカードを選択してください' };
  item.apply(cards);
  state.consumables.splice(idx, 1);
  return { message: `${item.name}を使用しました` };
}

export function proceedFromShop(state) {
  state.shop = null;
  goToBlindScreen(state);
}
