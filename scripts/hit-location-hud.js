const CONDITION_ICONS = {
  aflame: 'icons/svg/fire.svg',
  bleed: 'icons/svg/blood.svg',
  poison: 'icons/svg/poison.svg',
  stress: 'icons/svg/burst.svg',
  corruption: 'icons/svg/bone.svg',
  blind: 'icons/svg/eye.svg',
  deaf: 'icons/svg/deaf.svg',
  pain: 'icons/svg/daze.svg'
};

const FA_ICONS = {
  fatigue: 'fa-bed',
  entangle: 'fa-link',
  helpless: 'fa-skull',
  stun: 'fa-bolt',
  prone: 'fa-person-falling'
};

export class HitLocationHUD {
  static init() {
    console.log('Witch Iron | Hit Location HUD initializing');
    this.container = document.createElement('div');
    this.container.id = 'hit-location-hud';
    this.container.classList.add('hit-hud');
    const uiLeft = document.getElementById('ui-left');
    if (uiLeft) uiLeft.appendChild(this.container);
    else document.body.appendChild(this.container);

    this.currentActor = null;

    Hooks.on('controlToken', (token, controlled) => {
      if (controlled && token.actor?.isOwner) {
        this.currentActor = token.actor;
        this.render(token.actor);
        return;
      }

      const owned = canvas.tokens.controlled.filter(t => t.actor?.isOwner);
      if (owned.length > 0) {
        this.currentActor = owned[owned.length - 1].actor;
        this.render(this.currentActor);
      } else {
        this.currentActor = null;
        this.clear();
      }
    });

    Hooks.on('updateActor', (actor) => {
      if (this.currentActor && this.currentActor.id === actor.id) {
        this.render(actor);
      }
    });

    Hooks.on('updateItem', (item) => {
      if (this.currentActor && item.actor?.id === this.currentActor.id) {
        this.render(this.currentActor);
      }
    });
  }

  static clear() {
    if (this.container) this.container.innerHTML = '';
  }

  static async render(actor) {
    if (!this.container || !actor) return;

    const anatomy = actor.system?.anatomy || {};
    const trauma = actor.system?.conditions?.trauma || {};

    const condObj = actor.system?.conditions || {};
    const conditions = [];
    for (const [key, data] of Object.entries(condObj)) {
      if (key === 'trauma') continue;
      const value = Number(data?.value || 0);
      if (value >= 1) {
        conditions.push({
          key,
          value,
          icon: CONDITION_ICONS[key] || null,
          faIcon: FA_ICONS[key] || 'fa-exclamation-circle'
        });
      }
    }

    conditions.sort((a, b) => a.key.localeCompare(b.key));

    const data = { actor, anatomy, trauma, conditions };
    const html = await renderTemplate('systems/witch-iron/templates/hud/hit-location-hud.hbs', data);
    this.container.innerHTML = html;
    if (conditions.length > 5) this.container.classList.add('big');
    else this.container.classList.remove('big');
  }
}
