import * as Game from './game.js';
import { render, initUI } from './ui.js';

const root = document.getElementById('app');

let state = { screen: 'menu' };
let ui = { pendingConsumable: null, tarotSelectedIds: [], toast: null };

function rerender() {
  render(state, ui, root);
}

function dispatch(action, payload) {
  switch (action) {
    case 'new-game':
      state = Game.createNewGame();
      ui = { pendingConsumable: null, tarotSelectedIds: [], toast: null };
      break;

    case 'start-round':
      Game.startRound(state);
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
      const res = Game.playHand(state);
      if (res.error) ui.toast = res.error;
      break;
    }

    case 'discard-hand': {
      ui.toast = null;
      const res = Game.discardHand(state);
      if (res.error) ui.toast = res.error;
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
}

initUI(root, dispatch);
rerender();
