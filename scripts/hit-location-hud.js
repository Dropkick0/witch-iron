import { quarrelTracker } from "./quarrel.js";

export class HitLocationHUD {
  static init() {
    console.log('Witch Iron | Hit Location HUD initializing');
    this.container = document.createElement('div');
    this.container.id = 'hit-location-hud';
    document.body.appendChild(this.container);
    this.activeActor = null;

    Hooks.on('controlToken', (token, controlled) => {
      if (controlled && token.isOwner) {
        this.activeActor = token.actor;
        HitLocationHUD.render(token.actor);
      } else if (canvas.tokens.controlled.length) {
        const last = canvas.tokens.controlled.at(-1);
        if (last?.isOwner) {
          this.activeActor = last.actor;
          HitLocationHUD.render(last.actor);
        }
      } else {
        this.activeActor = null;
        HitLocationHUD.clear();
      }
    });

    Hooks.on('updateActor', (actor) => {
      if (this.activeActor?.id === actor.id) {
        HitLocationHUD.render(actor);
      }
    });

    Hooks.on('updateItem', (item) => {
      const actor = item.parent;
      if (actor && this.activeActor?.id === actor.id) {
        HitLocationHUD.render(actor);
      }
    });
  }

  static clear() {
    if (this.container) this.container.innerHTML = '';
  }

  static async render(actor) {
    if (!this.container || !actor) return;
    const injuries = actor.items.filter(i => i.type === 'injury');
    const condObj = actor.system?.conditions || {};

    const conditions = [];
    for (const [key, data] of Object.entries(condObj)) {
      const value = Number(data?.value || 0);
      if (key !== 'trauma' && value >= 1) {
        conditions.push({ key, value, icon: quarrelTracker.CONDITION_ICONS[key] });
      }
    }

    const trauma = condObj.trauma || {};
    const anatomy = actor.system?.anatomy || {};

    const data = { actor, injuries, conditions, trauma, anatomy };
    const html = await renderTemplate('systems/witch-iron/templates/hud/hit-location-hud.hbs', data);
    this.container.innerHTML = html;
  }
}
