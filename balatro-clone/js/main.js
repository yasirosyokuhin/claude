import * as Game from './game.js';
import { formatMult } from './scoring.js';
import { render, initUI } from './ui.js';

const root = document.getElementById('app');

let state = { screen: 'menu' };
let ui = { pendingConsumable: null, tarotSelectedIds: [], toast: null, animating: false, dealAnim: false };

function rerender() {
  render(state, ui, root);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pulse(el) {
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('pulse');
}

function setCounters(ev) {
  const chipsEl = document.getElementById('anim-chips');
  const multEl = document.getElementById('anim-mult');
  if (chipsEl && chipsEl.textContent !== String(ev.runningChips)) {
    chipsEl.textContent = ev.runningChips;
    pulse(chipsEl);
  }
  const multText = formatMult(ev.runningMult);
  if (multEl && multEl.textContent !== multText) {
    multEl.textContent = multText;
    pulse(multEl);
  }
}

function spawnPopups(anchor, popups) {
  if (!anchor || !popups) return;
  popups.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = `float-popup ${p.kind}`;
    el.textContent = p.text;
    el.style.top = `${-12 - i * 22}px`;
    el.style.animationDelay = `${i * 90}ms`;
    anchor.appendChild(el);
  });
}

async function animateScoring() {
  const result = state.pendingPlay.result;

  for (const ev of result.events) {
    if (ev.kind === 'base') {
      setCounters(ev);
      await sleep(380);
      continue;
    }

    let target = null;
    if (ev.cardId != null) target = document.querySelector(`[data-cid="${ev.cardId}"]`);
    if (ev.jokerId) target = document.querySelector(`[data-jid="${ev.jokerId}"]`);

    if (target) {
      const anchor = target.closest('.card-wrap') || target.closest('.tooltip-wrap') || target;
      target.classList.add(ev.kind === 'joker' ? 'trigger-wiggle' : 'trigger-pop');
      spawnPopups(anchor, ev.popups);
    }
    setCounters(ev);

    if (ev.broken && target) {
      await sleep(220);
      target.classList.add('shatter');
    }

    await sleep(ev.kind === 'card' ? 360 : 320);
    if (target) target.classList.remove('trigger-pop', 'trigger-wiggle');
  }

  const totalEl = document.getElementById('anim-total');
  if (totalEl) {
    totalEl.textContent = result.total;
    totalEl.classList.add('slam');
  }
  await sleep(800);
}

function dispatch(action, payload) {
  if (ui.animating) return;

  switch (action) {
    case 'new-game':
      state = Game.createNewGame();
      ui = { pendingConsumable: null, tarotSelectedIds: [], toast: null, animating: false, dealAnim: false };
      break;

    case 'start-round':
      Game.startRound(state);
      ui.dealAnim = true;
      break;

    case 'toggle-card': {
      const cardId = Number(payload.cardId);
      if (ui.pendingConsumable) {
        const idx = ui.tarotSelectedIds.indexOf(cardId);
        if (idx >= 0) {
          ui.tarotSelectedIds.splice(idx, 1);
        } else if (ui.tarotSelectedIds.length < ui.pendingConsumable.selectCount) {
          ui.tarotSelectedIds.push(cardId);
        }
      } else {
        Game.toggleCardSelection(state, cardId);
      }
      break;
    }

    case 'play-hand': {
      ui.toast = null;
      const pending = Game.beginPlay(state);
      if (pending.error) {
        ui.toast = pending.error;
        break;
      }
      ui.animating = true;
      rerender();
      animateScoring().then(() => {
        Game.finishPlay(state);
        ui.animating = false;
        ui.dealAnim = true;
        rerender();
        ui.dealAnim = false;
      });
      return;
    }

    case 'discard-hand': {
      ui.toast = null;
      const res = Game.discardHand(state);
      if (res.error) ui.toast = res.error;
      else ui.dealAnim = true;
      break;
    }

    case 'sort-rank':
      Game.sortHand(state, 'rank');
      break;

    case 'sort-suit':
      Game.sortHand(state, 'suit');
      break;

    case 'buy-item': {
      ui.toast = null;
      const res = Game.buyItem(state, Number(payload.index));
      if (res.error) ui.toast = res.error;
      break;
    }

    case 'reroll-shop': {
      ui.toast = null;
      const res = Game.rerollShop(state);
      if (res.error) ui.toast = res.error;
      break;
    }

    case 'sell-joker':
      Game.sellJoker(state, payload.instanceId);
      break;

    case 'use-consumable': {
      const item = state.consumables.find((c) => c.instanceId === payload.instanceId);
      if (!item) break;
      ui.toast = null;
      if (item.kind === 'planet') {
        const res = Game.useConsumable(state, item.instanceId);
        if (res.error) ui.toast = res.error;
      } else if (state.screen !== 'playing') {
        ui.toast = 'このカードは手札の選択が必要です。プレイ画面で使用してください';
      } else {
        ui.pendingConsumable = item;
        ui.tarotSelectedIds = [];
      }
      break;
    }

    case 'confirm-consumable': {
      if (ui.pendingConsumable) {
        const res = Game.useConsumable(state, ui.pendingConsumable.instanceId, ui.tarotSelectedIds);
        if (res.error) ui.toast = res.error;
        ui.pendingConsumable = null;
        ui.tarotSelectedIds = [];
      }
      break;
    }

    case 'cancel-consumable':
      ui.pendingConsumable = null;
      ui.tarotSelectedIds = [];
      break;

    case 'proceed-shop':
      Game.proceedFromShop(state);
      break;

    default:
      break;
  }
  rerender();
  ui.dealAnim = false;
}

initUI(root, dispatch);
rerender();
