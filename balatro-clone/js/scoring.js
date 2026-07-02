// Scoring pipeline: hand base -> per-card chips/enhancements -> held steel cards -> jokers

import { chipValue, rankLabel, suitInfo } from './cards.js';
import { getHandStats, HAND_TYPES, cardSuitMatches } from './hands.js';

export function isCardDebuffed(card, bossEffect) {
  if (!bossEffect || bossEffect.type !== 'debuff_suit') return false;
  if (card.enhancement === 'stone') return false;
  return cardSuitMatches(card, bossEffect.suit);
}

function cardLabel(card) {
  return `${rankLabel(card.rank)}${suitInfo(card.suit).symbol}`;
}

// Returns { chips, mult, total, events, brokenGlassIds }
export function computeScore({ type, level, scoringCards, playedCards, heldCards, jokers, bossEffect, gameState }) {
  const base = getHandStats(type, level);
  let chips = base.chips;
  let mult = base.mult;
  const events = [];
  const brokenGlassIds = [];

  events.push({ text: `${HAND_TYPES[type].name} (Lv.${level}) — 基礎 ${base.chips}チップ x${base.mult}マルト`, chips, mult });

  for (const card of scoringCards) {
    if (isCardDebuffed(card, bossEffect)) {
      events.push({ text: `${cardLabel(card)} 無効化(ボスブラインド)`, chips: 0, mult: 0 });
      continue;
    }

    let cardChips;
    if (card.enhancement === 'stone') {
      cardChips = 50;
    } else {
      cardChips = chipValue(card.rank) + (card.enhancement === 'bonus' ? 30 : 0);
    }
    chips += cardChips;

    let text = `${card.enhancement === 'stone' ? 'ストーンカード' : cardLabel(card)} +${cardChips}チップ`;

    if (card.enhancement === 'mult') {
      mult += 4;
      text += ' , +4マルト';
    } else if (card.enhancement === 'glass') {
      mult *= 2;
      text += ' , x2マルト';
      if (Math.random() < 0.25) {
        brokenGlassIds.push(card.id);
        text += ' (ガラスが砕け散った!)';
      }
    }

    events.push({ text, chips: cardChips, mult: 0 });

    for (const joker of jokers) {
      if (joker.hook === 'card') {
        const before = { chips, mult };
        const result = joker.onCardScored({ chips, mult }, card, gameState);
        if (result) {
          chips = result.chips;
          mult = result.mult;
          if (chips !== before.chips || mult !== before.mult) {
            events.push({ text: `${joker.name}: ${describeDelta(before, { chips, mult })}`, chips: 0, mult: 0 });
          }
        }
      }
    }
  }

  for (const card of heldCards) {
    if (card.enhancement === 'steel' && !isCardDebuffed(card, bossEffect)) {
      const before = mult;
      mult *= 1.5;
      events.push({ text: `${cardLabel(card)} (スチール, 手札保持) x1.5マルト`, chips: 0, mult: 0 });
    }
  }

  for (const joker of jokers) {
    if (joker.hook === 'hand') {
      const before = { chips, mult };
      const result = joker.onHandScored({ chips, mult }, { type, playedCards, scoringCards, heldCards, gameState });
      if (result) {
        chips = result.chips;
        mult = result.mult;
        if (chips !== before.chips || mult !== before.mult) {
          events.push({ text: `${joker.name}: ${describeDelta(before, { chips, mult })}`, chips: 0, mult: 0 });
        }
      }
    }
  }

  const total = Math.floor(chips * mult);
  return { chips, mult, total, events, brokenGlassIds };
}

function describeDelta(before, after) {
  const parts = [];
  if (after.chips !== before.chips) parts.push(`${after.chips > before.chips ? '+' : ''}${Math.round(after.chips - before.chips)}チップ`);
  if (after.mult !== before.mult) {
    if (Math.abs(after.mult / (before.mult || 1) - Math.round(after.mult / (before.mult || 1))) < 1e-9 && after.mult / (before.mult || 1) !== 1 && before.mult !== 0) {
      // could be multiplicative but we just show absolute new value for clarity
    }
    parts.push(`マルト ${before.mult.toFixed(1)} → ${after.mult.toFixed(1)}`);
  }
  return parts.join(', ') || '効果発動';
}
