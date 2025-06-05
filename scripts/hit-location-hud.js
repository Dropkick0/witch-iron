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

// Descriptive info for each condition including a function to
// generate the tooltip text based on its rating
const CONDITION_INFO = {
  aflame: {
    name: 'Aflame',
    effect: r => `Roll 1d6 each round. On ≤ ${r}, Hardship Quarrel vs ${r} or die.`
  },
  bleed: {
    name: 'Bleed',
    effect: r => `Roll 1d6 each round. On ≤ ${r}, Hardship Quarrel vs ${r} or die.`
  },
  poison: {
    name: 'Poison',
    effect: r => `Roll 1d6 each round. On ≤ ${r}, Hardship Quarrel vs ${r} or die.`
  },
  blind: {
    name: 'Blind',
    effect: r => `${r * 10}% penalty to sight checks (reduce 1/hour).`
  },
  deaf: {
    name: 'Deaf',
    effect: r => `${r * 10}% penalty to hearing & speech checks (reduce 1/hour).`
  },
  pain: {
    name: 'Pain',
    effect: r => `${r * 10}% penalty to all checks (reduce 1/hour).`
  },
  stress: {
    name: 'Stress',
    effect: r => `Every 3 stacks: Steel quarrel vs ${r} or gain Madness.`
  },
  corruption: {
    name: 'Corruption',
    effect: r => `Every 3 stacks: Steel quarrel vs ${r} or gain Mutation.`
  },
  fatigue: {
    name: 'Fatigue',
    effect: () => 'Takes up Encumbrance; removed by rest.'
  },
  entangle: {
    name: 'Entangle',
    effect: () => 'Prevents movement. Reduce 1 each round.'
  },
  helpless: {
    name: 'Helpless',
    effect: () => 'Prevents actions & movement; foes may inflict any Injury. Reduce 1/round.'
  },
  stun: {
    name: 'Stun',
    effect: () => 'Prevents actions. Reduce 1 each round.'
  },
  prone: {
    name: 'Prone',
    effect: () => '-20% to checks; foes +20% until you stand.'
  }
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

    // Calculate per-location soak tooltip text
    const rb = Number(actor.system?.attributes?.robustness?.bonus || 0);
    const wear = Number(actor.system?.battleWear?.armor?.value || 0);
    const soakTooltips = {};
    for (const loc of ["head","torso","leftArm","rightArm","leftLeg","rightLeg"]) {
      const locData = anatomy[loc] || {};
      const soak = Number(locData.soak || 0);
      const av = Number(locData.armor || 0);
      const other = soak - rb - (av - wear);
      const otherVal = other > 0 ? other : 0;
      soakTooltips[loc] = `${rb} + ${otherVal} + (${av} - ${wear}) = ${soak}`;
    }

    const condObj = actor.system?.conditions || {};
    const conditions = [];
    for (const [key, data] of Object.entries(condObj)) {
      if (key === 'trauma') continue;
      const value = Number(data?.value || 0);
      if (value >= 1) {
        const info = CONDITION_INFO[key];
        const name = info?.name || key.charAt(0).toUpperCase() + key.slice(1);
        const effect = info?.effect ? info.effect(value) : '';
        const tooltip = `${name} ${value}${effect ? `: ${effect}` : ''}`;
        conditions.push({
          key,
          value,
          faIcon: FA_ICONS[key] || 'fa-exclamation-circle',
          tooltip
        });
      }
    }

    conditions.sort((a, b) => a.key.localeCompare(b.key));

    // Trauma tooltip text per location
    const traumaTooltips = {};
    for (const loc of Object.keys(trauma)) {
      const rating = Number(trauma[loc]?.value || 0);
      if (rating > 0) {
        const locLabel = loc.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
        traumaTooltips[loc] = `Trauma (${locLabel}) ${rating}: ${rating * 20}% penalty to checks involving ${locLabel}.`;
      }
    }

    const data = { actor, anatomy, trauma, conditions, soakTooltips, traumaTooltips };
    const html = await renderTemplate('systems/witch-iron/templates/hud/hit-location-hud.hbs', data);
    this.container.innerHTML = html;
  }
}
