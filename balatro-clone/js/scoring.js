// Scoring pipeline: hand base -> per-card chips/enhancements -> held steel cards -> jokers
// Emits a structured event stream so the UI can replay the calculation step by step
// (Balatro-style sequential card pops with floating +chips / +mult popups).
// Event shape: { kind: 'base'|'card'|'held'|'joker', text, runningChips, runningMult,
//                cardId?, jokerId?, popups?: [{text, kind:'chips'|'mult'|'info'}], broken?, debuffed? }

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

export function formatMult(m) {
  return Number.isInteger(m) ? String(m) : m.toFixed(1);
}

function deltaPopups(before, after, preferRatio = false) {
  const popups = [];
  if (after.chips !== before.chips) {
    popups.push({ text: `+${Math.round(after.chips - before.chips)}`, kind: 'chips' });
  }
  if (after.mult !== before.mult) {
    if (preferRatio && before.mult > 0) {
      popups.push({ text: `x${formatMult(Math.round((after.mult / before.mult) * 10) / 10)} マルト`, kind: 'mult' });
    } else {
      popups.push({ text: `+${formatMult(after.mult - before.mult)} マルト`, kind: 'mult' });
    }
  }
  return popups;
}

function describeDelta(before, after) {
  const parts = [];
  if (after.chips !== before.chips) parts.push(`+${Math.round(after.chips - before.chips)}チップ`);
  if (after.mult !== before.mult) parts.push(`マルト ${formatMult(before.mult)} → ${formatMult(after.mult)}`);
  return parts.join(', ') || '効果発動';
}

// Returns { chips, mult, total, events, brokenGlassIds }
export function computeScore({ type, level, scoringCards, playedCards, heldCards, jokers, bossEffect, gameState }) {
  const base = getHandStats(type, level);
  let chips = base.chips;
  let mult = base.mult;
  const events = [];
  const brokenGlassIds = [];

  const push = (ev) => events.push({ ...ev, runningChips: chips, runningMult: mult });

  push({ kind: 'base', text: `${HAND_TYPES[type].name} (Lv.${level}) — 基礎 ${base.chips}チップ x${base.mult}マルト` });

  for (const card of scoringCards) {
    if (isCardDebuffed(card, bossEffect)) {
      push({
        kind: 'card',
        cardId: card.id,
        debuffed: true,
        popups: [{ text: '無効', kind: 'info' }],
        text: `${cardLabel(card)} 無効化(ボスブラインド)`,
      });
      continue;
    }

    let cardChips;
    if (card.enhancement === 'stone') {
      cardChips = 50;
    } else {
      cardChips = chipValue(card.rank) + (card.enhancement === 'bonus' ? 30 : 0);
    }
    chips += cardChips;

    const popups = [{ text: `+${cardChips}`, kind: 'chips' }];
    let text = `${card.enhancement === 'stone' ? 'ストーンカード' : cardLabel(card)} +${cardChips}チップ`;
    let broken = false;

    if (card.enhancement === 'mult') {
      mult += 4;
      popups.push({ text: '+4 マルト', kind: 'mult' });
      text += ' , +4マルト';
    } else if (card.enhancement === 'glass') {
      mult *= 2;
      popups.push({ text: 'x2 マルト', kind: 'mult' });
      text += ' , x2マルト';
      if (Math.random() < 0.25) {
        brokenGlassIds.push(card.id);
        broken = true;
        text += ' (ガラスが砕け散った!)';
      }
    }

    push({ kind: 'card', cardId: card.id, popups, broken, text });

    for (const joker of jokers) {
      if (joker.hook === 'card') {
        const before = { chips, mult };
        const result = joker.onCardScored({ chips, mult }, card, gameState);
        if (result) {
          chips = result.chips;
          mult = result.mult;
          if (chips !== before.chips || mult !== before.mult) {
            push({
              kind: 'joker',
              jokerId: joker.instanceId,
              popups: deltaPopups(before, { chips, mult }, joker.xmult),
              text: `${joker.name}: ${describeDelta(before, { chips, mult })}`,
            });
          }
        }
      }
    }
  }

  for (const card of heldCards) {
    if (card.enhancement === 'steel' && !isCardDebuffed(card, bossEffect)) {
      mult *= 1.5;
      push({
        kind: 'held',
        cardId: card.id,
        popups: [{ text: 'x1.5 マルト', kind: 'mult' }],
        text: `${cardLabel(card)} (スチール, 手札保持) x1.5マルト`,
      });
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
          push({
            kind: 'joker',
            jokerId: joker.instanceId,
            popups: deltaPopups(before, { chips, mult }, joker.xmult),
            text: `${joker.name}: ${describeDelta(before, { chips, mult })}`,
          });
        }
      }
    }
  }

  const total = Math.floor(chips * mult);
  return { chips, mult, total, events, brokenGlassIds };
}
