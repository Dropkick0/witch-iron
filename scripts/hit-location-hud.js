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
    if (uiLeft) {
      const controls = uiLeft.querySelector('#controls');
      if (controls) controls.insertAdjacentElement('afterend', this.container);
      else uiLeft.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }

    this.currentActor = null;
    this.multiActors = [];

    this.container.addEventListener('click', ev => {
      const card = ev.target.closest('.actor-card');
      if (!card) return;
      const id = card.dataset.actorId;
      const actor = this.multiActors.find(a => a.id === id) || game.actors.get(id);
      if (actor) {
        this.currentActor = actor;
        this.render(actor);
      }
    });

    Hooks.on('controlToken', () => {
      this.updateFromSelection();
    });

    Hooks.on('updateActor', (actor) => {
      if (this.currentActor && this.currentActor.id === actor.id) {
        this.render(actor);
      }
      this.refreshInjuryMessages(actor);
    });

    Hooks.on('updateItem', (item) => {
      if (this.currentActor && item.actor?.id === this.currentActor.id) {
        this.render(this.currentActor);
      }
      if (item.actor) this.refreshInjuryMessages(item.actor);
    });

    Hooks.on('createItem', (item) => {
      if (this.currentActor && item.actor?.id === this.currentActor.id) {
        this.render(this.currentActor);
      }
      if (item.actor) this.refreshInjuryMessages(item.actor);
    });

    Hooks.on('deleteItem', (item) => {
      if (this.currentActor && item.actor?.id === this.currentActor.id) {
        this.render(this.currentActor);
      }
      if (item.actor) this.refreshInjuryMessages(item.actor);
    });

    this.updateFromSelection();
  }

  static updateFromSelection() {
    const owned = canvas?.tokens?.controlled.filter(t => t.actor?.isOwner) || [];
    if (owned.length > 0) {
      this.multiActors = owned.map(t => t.actor);
    } else {
      const playerActor = game.user?.character;
      this.multiActors = playerActor ? [playerActor] : [];
    }

    if (this.multiActors.length > 0) {
      if (!this.currentActor || !this.multiActors.some(a => a.id === this.currentActor.id)) {
        this.currentActor = this.multiActors[this.multiActors.length - 1];
      }
      this.render(this.currentActor);
    } else {
      this.currentActor = null;
      this.clear();
    }
  }

  static clear() {
    if (this.container) this.container.innerHTML = '';
  }

  static async render(actor) {
    if (!this.container || !actor) {
      this.clear();
      return;
    }

    const trauma = actor.system?.conditions?.trauma || {};
    const anatomy = {};

    // Calculate per-location soak tooltip text
    const rb = Number(actor.system?.attributes?.robustness?.bonus || 0);
    const wear = {};
    const soakTooltips = {};
    const baseAv = Number(actor.system?.derived?.armorBonus || 0);
    const LOCS = ["head","torso","leftArm","rightArm","leftLeg","rightLeg"];
    for (const loc of LOCS) {
      wear[loc] = Number(actor.system?.battleWear?.armor?.[loc]?.value || 0);
      const soak = Number(actor.system?.derived?.locationSoak?.[loc] || 0);
      const baseAv = actor.type === 'monster'
        ? Number(actor.system?.derived?.armorBonus || 0)
        : Number(actor.system?.anatomy?.[loc]?.armor || 0);
      const av = Math.max(0, baseAv - wear[loc]);
      const other = soak - rb - av;
      const otherVal = other > 0 ? other : 0;
      anatomy[loc] = { soak, armor: av };
      soakTooltips[loc] = `Soak/AV ${soak}/${av}: ${rb} + ${otherVal} + (${baseAv} - ${wear[loc]}) = ${soak}`;
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
        const penalty = rating * 20;
        traumaTooltips[loc] = `Trauma ${rating} (${locLabel}): ${penalty}% penalty to checks involving ${locLabel}.`;
      }
    }

    const selectorData = this.multiActors.map(a => ({ id: a.id, name: a.name }));

    // Determine limb loss based on injury items
    const limbLoss = { leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 };
    for (const item of actor.items || []) {
      if (item.type !== 'injury') continue;
      const effect = (item.system?.effect || '').toLowerCase();
      const desc = (item.system?.description || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const loc = (item.system?.location || '').toLowerCase();
      const tokens = [name, desc, loc, effect];
      const hasLeft = tokens.some(t => /\bleft\b|\(l\)/.test(t));
      const hasRight = tokens.some(t => /\bright\b|\(r\)/.test(t));
      const side = hasLeft && !hasRight ? 'left' : hasRight && !hasLeft ? 'right' : null;

      let amt = 0;
      let limb = null;
      if (effect.includes('lost hand') || name.includes('severed hand')) {
        amt = 0.25; limb = 'arm';
      } else if (effect.includes('lost foot') || name.includes('severed foot')) {
        amt = 0.25; limb = 'leg';
      } else if (effect.includes('lost forearm') || name.includes('severed forearm') || effect.includes('lost shin') || name.includes('severed shin')) {
        amt = 0.5; limb = effect.includes('shin') || name.includes('shin') ? 'leg' : 'arm';
      } else if (effect.includes('lost arm') || name.includes('severed arm') || effect.includes('lost leg') || name.includes('severed leg')) {
        amt = 1; limb = effect.includes('leg') || name.includes('leg') ? 'leg' : 'arm';
      }
      if (amt === 0) continue;

      if (side === 'left') {
        limbLoss[limb === 'arm' ? 'leftArm' : 'leftLeg'] = Math.max(limbLoss[limb === 'arm' ? 'leftArm' : 'leftLeg'], amt);
      } else if (side === 'right') {
        limbLoss[limb === 'arm' ? 'rightArm' : 'rightLeg'] = Math.max(limbLoss[limb === 'arm' ? 'rightArm' : 'rightLeg'], amt);
      } else {
        const armKey = limb === 'arm' ? ['leftArm','rightArm'] : ['leftLeg','rightLeg'];
        for (const k of armKey) limbLoss[k] = Math.max(limbLoss[k], amt);
      }
    }

    const limbLossClass = {};
    for (const [k,v] of Object.entries(limbLoss)) {
      limbLossClass[k] = v >= 1 ? 'missing-100' : v >= 0.5 ? 'missing-50' : v >= 0.25 ? 'missing-25' : '';
    }

    const data = { actor, selectors: selectorData, anatomy, trauma, conditions, soakTooltips, traumaTooltips, limbLossClass };
    const html = await renderTemplate('systems/witch-iron/templates/hud/hit-location-hud.hbs', data);
    this.container.innerHTML = html;
  }

  /**
   * Update any injury chat cards that reference this actor
   * @param {Actor} actor
   */
  static refreshInjuryMessages(actor) {
    const messages = game.messages?.contents || [];
    for (const msg of messages) {
      const inj = msg.getFlag('witch-iron', 'injuryData');
      if (!inj) continue;
      if (inj.attacker === actor.name || inj.defender === actor.name) {
        const el = document.querySelector(`.message[data-message-id="${msg.id}"]`);
        if (!el) continue;
        if (inj.attacker === actor.name) {
          const w = actor.system?.battleWear?.weapon?.value || 0;
          el.querySelectorAll('.attacker-wear .battle-wear-value').forEach(e => e.textContent = w);
          el.querySelectorAll('.attacker-wear .battle-wear-bonus').forEach(e => e.textContent = w);

          const dmgVal = inj.abilityDmg ?? 3;
          const eff = actor.system?.derived?.weaponBonusEffective || 0;
          const grid = el.querySelector('.combat-details .grid-two');
          const vals = grid?.querySelectorAll('span.value');
          if (vals && vals[0]) vals[0].textContent = `${dmgVal}(${eff})`;
        }
        if (inj.defender === actor.name) {
          const locMap = { head:'head', torso:'torso', 'left-arm':'leftArm', 'right-arm':'rightArm', 'left-leg':'leftLeg', 'right-leg':'rightLeg' };
          const locKey = locMap[(inj.location || '').toLowerCase().replace(/\s+/g,'-')] || (inj.location || '').toLowerCase();
          const aWear = actor.system?.battleWear?.armor?.[locKey]?.value || 0;
          el.querySelectorAll('.defender-wear .battle-wear-value').forEach(e => e.textContent = aWear);
          el.querySelectorAll('.defender-wear .battle-wear-bonus').forEach(e => e.textContent = aWear);

          const soakVal = actor.system?.derived?.locationSoak?.[locKey] || (inj.abilitySoak ?? 3);
          const eff = actor.system?.derived?.armorBonusEffective?.[locKey] || 0;
          const grid = el.querySelector('.combat-details .grid-two');
          const vals = grid?.querySelectorAll('span.value');
          if (vals && vals[1]) vals[1].textContent = `${soakVal}(${eff})`;
        }
      }
    }
  }
}
