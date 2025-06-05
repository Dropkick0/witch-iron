const FA_ICONS = {
  aflame: 'fa-fire',
  bleed: 'fa-droplet',
  poison: 'fa-skull-crossbones',
  stress: 'fa-burst',
  corruption: 'fa-biohazard',
  blind: 'fa-eye-slash',
  deaf: 'fa-ear-deaf',
  pain: 'fa-hand-holding-medical',
  fatigue: 'fa-face-downcast-sweat',
  entangle: 'fa-link',
  helpless: 'fa-skull',
  stun: 'fa-bolt',
  prone: 'fa-person-falling'
};

const CONDITION_INFO = {
  aflame: { name: 'Aflame', effect: 'Smoldering Flesh. Roll d6 each round, on <= rating make a Hardship Quarrel vs rating to remove all Aflame, Bleed or Poison or die.' },
  bleed: { name: 'Bleed', effect: 'Deep Gashes. Roll d6 each round, on <= rating make a Hardship Quarrel vs rating to remove all Aflame, Bleed or Poison or die.' },
  poison: { name: 'Poison', effect: 'Vile Toxins. Roll d6 each round, on <= rating make a Hardship Quarrel vs rating to remove all Aflame, Bleed or Poison or die.' },
  stress: { name: 'Stress', effect: 'Profane Thoughts. On three stacks make a Hardship or Steel Quarrel vs rating or become changed.' },
  corruption: { name: 'Corruption', effect: 'Traitorous Flesh. On three stacks make a Hardship or Steel Quarrel vs rating or become changed.' },
  blind: { name: 'Blind', effect: 'Retina Overload. -(rating*10)% to sight-based checks. Reduces by one each hour.' },
  deaf: { name: 'Deaf', effect: 'Ringing in Ears. -(rating*10)% to hearing and speech checks. Reduces by one each hour.' },
  pain: { name: 'Pain', effect: 'Agony. -(rating*10)% to all checks. Reduces by one each hour.' },
  fatigue: { name: 'Fatigue', effect: 'Muscle Exhaustion. Occupies Encumbrance slots; removed by rest if not from a lingering quarrel.' },
  entangle: { name: 'Entangle', effect: 'Restricts movement. Reduces by one each round or slip out.' },
  helpless: { name: 'Helpless', effect: 'Prevents actions and movement. Opponents can inflict any injury while in melee.' },
  stun: { name: 'Stun', effect: 'Prevents actions. Reduced by smelling salts.' },
  prone: { name: 'Prone', effect: '-20% to checks and enemies gain +20%. Spend an action to stand.' }
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
        const info = CONDITION_INFO[key] || { name: capitalize(key), effect: '' };
        conditions.push({
          key,
          value,
          faIcon: FA_ICONS[key] || 'fa-exclamation-circle',
          tooltip: `${info.name} (${value}) - ${info.effect}`
        });
      }
    }

    conditions.sort((a, b) => a.key.localeCompare(b.key));

    const soakTooltips = {};
    const rb = actor.system?.attributes?.robustness?.bonus || 0;
    const wear = actor.system?.battleWear?.armor?.value || 0;
    for (const loc of ['head','torso','leftArm','rightArm','leftLeg','rightLeg']) {
      const part = anatomy[loc] || {};
      const soak = Number(part.soak || 0);
      const av = Number(part.armor || 0);
      const other = soak - rb - (av - wear);
      soakTooltips[loc] = `Soak = ${rb} + ${other} + (${av} - ${wear}) = ${soak}`;
    }

    const data = { actor, anatomy, trauma, conditions, soakTooltips };
    const html = await renderTemplate('systems/witch-iron/templates/hud/hit-location-hud.hbs', data);
    this.container.innerHTML = html;
  }
}
