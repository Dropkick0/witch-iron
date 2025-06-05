export class HitLocationHUD {
  static init() {
    console.log('Witch Iron | Hit Location HUD initializing');
    this.container = document.createElement('div');
    this.container.id = 'hit-location-hud';
    document.body.appendChild(this.container);

    Hooks.on('controlToken', (token, controlled) => {
      if (controlled) {
        HitLocationHUD.render(token.actor);
      } else if (canvas.tokens.controlled.length === 0) {
        HitLocationHUD.clear();
      }
    });

    Hooks.on('updateActor', (actor) => {
      if (canvas.tokens.controlled.some(t => t.actor === actor)) {
        HitLocationHUD.render(actor);
      }
    });
  }

  static clear() {
    if (this.container) this.container.innerHTML = '';
  }

  static async render(actor) {
    if (!this.container) return;
    const injuries = actor.items.filter(i => i.type === 'injury');
    const conditions = actor.system?.conditions || {};
    const data = { actor, injuries, conditions };
    const html = await renderTemplate('systems/witch-iron/templates/hud/hit-location-hud.hbs', data);
    this.container.innerHTML = html;
  }
}
