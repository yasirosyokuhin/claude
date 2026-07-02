// Rendering + event delegation

import { rankLabel, suitInfo, ENHANCEMENTS } from './cards.js';
import { HAND_TYPES, evaluateHand } from './hands.js';
import { computeScore } from './scoring.js';
import { BLIND_KINDS, MAX_ANTE } from './blinds.js';

let _dispatch = null;

export function initUI(root, dispatch) {
  _dispatch = dispatch;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    _dispatch(el.dataset.action, { ...el.dataset });
  });
}

function esc(s) {
  return String(s);
}

function enhTag(card) {
  if (!card.enhancement || card.enhancement === 'none') return '';
  return `<span class="enh-tag">${ENHANCEMENTS[card.enhancement].name}</span>`;
}

function cardHTML(card, { selected = false, debuffed = false, disabled = false } = {}) {
  const info = suitInfo(card.suit);
  const isStone = card.enhancement === 'stone';
  const classes = ['card', isStone ? 'stone' : info.color];
  if (selected) classes.push('selected');
  if (debuffed) classes.push('debuffed');
  const label = isStone ? '★' : rankLabel(card.rank);
  const symbol = isStone ? '' : info.symbol;
  return `<div class="${classes.join(' ')}" ${disabled ? '' : `data-action="toggle-card" data-card-id="${card.id}"`}>
    <div class="rank">${label}</div>
    <div class="suit-symbol">${symbol}</div>
    ${enhTag(card)}
  </div>`;
}

function tooltip(text) {
  return `<div class="tooltip">${text}</div>`;
}

function jokerHTML(joker, { sellable = false } = {}) {
  return `<div class="tooltip-wrap">
    <div class="joker-card rarity-${joker.rarity}" ${sellable ? `data-action="sell-joker" data-instance-id="${joker.instanceId}"` : ''}>
      <div class="name">${joker.name}</div>
    </div>
    ${tooltip(`${joker.desc}${sellable ? `<br><b>クリックで売却 (+$${Math.ceil(joker.cost / 2)})</b>` : ''}`)}
  </div>`;
}

function consumableHTML(item, { usable = false } = {}) {
  return `<div class="tooltip-wrap">
    <div class="consumable-card ${item.kind}" ${usable ? `data-action="use-consumable" data-instance-id="${item.instanceId}"` : ''}>
      <div class="name">${item.name}</div>
    </div>
    ${tooltip(item.desc)}
  </div>`;
}

function renderHUD(state) {
  const blind = BLIND_KINDS[state.blindIndex];
  let extra = '';
  if (state.screen === 'playing') {
    extra = `
      <div class="stat-pill score"><span class="label">現在スコア</span><span class="value">${state.currentBlindScore}</span></div>
      <div class="stat-pill required"><span class="label">必要スコア</span><span class="value">${state.blindRequirement}</span></div>
      <div class="stat-pill"><span class="label">残ハンド</span><span class="value">${state.handsLeft}</span></div>
      <div class="stat-pill"><span class="label">残ディスカード</span><span class="value">${state.discardsLeft}</span></div>
    `;
  }
  return `<div class="hud">
    <div class="stat-pill money"><span class="label">所持金</span><span class="value">$${state.money}</span></div>
    <div class="stat-pill"><span class="label">アンティ</span><span class="value">${state.ante} / ${MAX_ANTE}</span></div>
    <div class="stat-pill"><span class="label">ブラインド</span><span class="value">${blind.name}</span></div>
    ${extra}
  </div>`;
}

function renderRows(state, { sellable = false, usable = false } = {}) {
  const jokerSlots = [];
  for (let i = 0; i < state.jokerSlots; i++) {
    jokerSlots.push(state.jokers[i] ? jokerHTML(state.jokers[i], { sellable }) : '<div class="empty-slot"></div>');
  }
  const consumableSlots = [];
  for (let i = 0; i < state.consumableSlots; i++) {
    consumableSlots.push(state.consumables[i] ? consumableHTML(state.consumables[i], { usable }) : '<div class="empty-slot"></div>');
  }
  return `<div class="rows-container">
    <div class="slot-panel">
      <div class="slot-title">ジョーカー (${state.jokers.length}/${state.jokerSlots})</div>
      <div class="slot-row">${jokerSlots.join('')}</div>
    </div>
    <div class="slot-panel">
      <div class="slot-title">アイテム (${state.consumables.length}/${state.consumableSlots})</div>
      <div class="slot-row">${consumableSlots.join('')}</div>
    </div>
  </div>`;
}

function renderMenu() {
  return `<div class="center-screen">
    <div class="title-logo">BALATRO<br><span style="font-size:28px">クローン</span></div>
    <p class="subtitle">ポーカーハンドで役を作り、ジョーカーを集めてアンティ${MAX_ANTE}のボスを倒そう</p>
    <button data-action="new-game">はじめる</button>
  </div>`;
}

function renderGameOver(state) {
  return `<div class="center-screen">
    <h1 style="color:#e88585">GAME OVER</h1>
    <p>${esc(state.gameOverReason || '')}</p>
    <p>到達アンティ: ${state.ante} / 所持金: $${state.money} / 所持ジョーカー: ${state.jokers.length}</p>
    <button data-action="new-game">もう一度プレイ</button>
  </div>`;
}

function renderWin(state) {
  return `<div class="center-screen">
    <h1 style="color:var(--gold)">WIN!</h1>
    <p>アンティ${MAX_ANTE}のボスブラインドを撃破しました!</p>
    <p>所持金: $${state.money} / 所持ジョーカー: ${state.jokers.length}</p>
    <button data-action="new-game">もう一度プレイ</button>
  </div>`;
}

function renderBlind(state) {
  const blind = BLIND_KINDS[state.blindIndex];
  return `${renderHUD(state)}
  ${renderRows(state)}
  <div class="center-screen" style="min-height:40vh">
    <div class="blind-info-card">
      <div class="blind-name">${blind.name}</div>
      <div>必要スコア</div>
      <div class="req-score">${state.blindRequirement}</div>
      <div>報酬: 基本 $${blind.reward} + 残ハンド1回につき$1 + 利子</div>
      ${state.bossEffect ? `<div class="boss-desc"><b>${state.bossEffect.name}</b><br>${state.bossEffect.desc}</div>` : ''}
      <div style="margin-top:16px"><button data-action="start-round">挑戦する</button></div>
    </div>
  </div>`;
}

function renderPreview(state, ui) {
  const selected = state.hand.filter((c) => c.selected);
  if (ui.pendingConsumable) {
    const need = ui.pendingConsumable.selectCount;
    return `<div class="pending-hint">「${ui.pendingConsumable.name}」を使用中 — カードを${need}枚選択してください (${ui.tarotSelectedIds.length}/${need})
      <div style="margin-top:6px">
        <button data-action="confirm-consumable" ${ui.tarotSelectedIds.length === need ? '' : 'disabled'}>確定</button>
        <button class="danger" data-action="cancel-consumable">キャンセル</button>
      </div>
    </div>`;
  }
  if (selected.length === 0) return `<div class="hand-type-banner">カードを選択してください(最大5枚)</div>`;
  const { type, scoringCards } = evaluateHand(selected);
  const heldCards = state.hand.filter((c) => !c.selected);
  const preview = computeScore({
    type,
    level: state.handLevels[type],
    scoringCards,
    playedCards: selected,
    heldCards,
    jokers: state.jokers,
    bossEffect: state.bossEffect,
    gameState: { ...state, transient: {} },
  });
  return `<div class="hand-type-banner"><b>${HAND_TYPES[type].name}</b> (Lv.${state.handLevels[type]}) &nbsp; ${preview.chips}チップ &times; ${preview.mult.toFixed(1)}マルト = <b>${preview.total}</b></div>`;
}

function renderScoreLog(state) {
  if (!state.lastScoreResult) return '';
  const lines = state.lastScoreResult.events.map((e) => `<div>${e.text}</div>`).join('');
  return `<div class="score-log">${lines}<div><b>合計: ${state.lastScoreResult.total}</b></div></div>`;
}

function isCardSelectedForDisplay(card, ui) {
  if (ui.pendingConsumable) return ui.tarotSelectedIds.includes(card.id);
  return card.selected;
}

function renderPlaying(state, ui) {
  const cardsHTML = state.hand
    .map((c) => cardHTML(c, { selected: isCardSelectedForDisplay(c, ui), debuffed: isDebuffedDisplay(c, state) }))
    .join('');

  const controls = ui.pendingConsumable
    ? ''
    : `<div class="actions-row">
        <button data-action="play-hand" ${state.handsLeft <= 0 ? 'disabled' : ''}>プレイ</button>
        <button class="danger" data-action="discard-hand" ${state.discardsLeft <= 0 ? 'disabled' : ''}>捨てる</button>
        <button class="secondary" data-action="sort-rank">ランク順</button>
        <button class="secondary" data-action="sort-suit">スート順</button>
      </div>`;

  return `${renderHUD(state)}
  ${renderRows(state, { usable: true })}
  ${renderToast(ui)}
  ${renderPreview(state, ui)}
  <div class="hand-area">${cardsHTML}</div>
  ${controls}
  ${renderScoreLog(state)}`;
}

function isDebuffedDisplay(card, state) {
  if (!state.bossEffect || state.bossEffect.type !== 'debuff_suit') return false;
  if (card.enhancement === 'stone') return false;
  return card.enhancement === 'wild' || card.suit === state.bossEffect.suit;
}

function renderToast(ui) {
  if (!ui.toast) return '';
  return `<div class="pending-hint" style="border-color:#e88585">${esc(ui.toast)}</div>`;
}

function renderShop(state, ui) {
  const items = state.shop.items
    .map((item, i) => {
      if (!item) return `<div class="shop-item sold-out"><div>売り切れ</div></div>`;
      const badge = { joker: 'ジョーカー', tarot: 'タロット', planet: '惑星' }[item.type];
      const affordable = state.money >= item.cost;
      return `<div class="shop-item">
        <span class="badge">${badge}</span>
        <div><b>${item.name}</b></div>
        <div class="desc">${item.desc}</div>
        <div class="cost">$${item.cost}</div>
        <button data-action="buy-item" data-index="${i}" ${affordable ? '' : 'disabled'}>購入</button>
      </div>`;
    })
    .join('');

  const hasFreeReroll = state.jokers.some((j) => j.freeFirstReroll) && !state.shop.freeRerollUsed;
  const rerollLabel = hasFreeReroll ? '無料リロール' : `リロール ($${state.shop.rerollCost})`;
  const rerollDisabled = !hasFreeReroll && state.money < state.shop.rerollCost;

  const rewardBox = state.lastRoundReward
    ? `<div class="reward-box"><b>+$${state.lastRoundReward.total}</b><br><span style="font-size:12px">${state.lastRoundReward.messages.join(' / ')}</span></div>`
    : '';

  return `${renderHUD(state)}
  ${renderRows(state, { sellable: true, usable: true })}
  ${renderToast(ui)}
  ${rewardBox}
  <h2>ショップ</h2>
  <div class="shop-grid">${items}</div>
  <div class="actions-row">
    <button class="secondary" data-action="reroll-shop" ${rerollDisabled ? 'disabled' : ''}>${rerollLabel}</button>
    <button data-action="proceed-shop">次のブラインドへ</button>
  </div>`;
}

export function render(state, ui, root) {
  let html;
  switch (state.screen) {
    case 'menu':
      html = renderMenu();
      break;
    case 'blind':
      html = renderBlind(state);
      break;
    case 'playing':
      html = renderPlaying(state, ui);
      break;
    case 'shop':
      html = renderShop(state, ui);
      break;
    case 'gameover':
      html = renderGameOver(state);
      break;
    case 'win':
      html = renderWin(state);
      break;
    default:
      html = renderMenu();
  }
  root.innerHTML = html;
}
