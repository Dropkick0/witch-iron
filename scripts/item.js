/**
 * Extends the base Item class for Witch Iron items.
 * @extends {Item}
 */
export class WitchIronItem extends Item {

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
    
    // Handle item-type-specific data preparation
    const itemData = this.system;
    
    // Add calculated or derived data based on item type
    switch(this.type) {
      case "injury":
        this._prepareInjuryData(itemData);
        break;
      case "weapon":
        this._prepareWeaponData(itemData);
        break;
      case "armor":
        this._prepareArmorData(itemData);
        break;
      case "gear":
        this._prepareGearData(itemData);
        break;
      case "consumable":
        this._prepareConsumableData(itemData);
        break;
      case "artifact":
        this._prepareArtifactData(itemData);
        break;
      case "mutation":
        this._prepareMutationData(itemData);
        break;
      case "madness":
        this._prepareMadnessData(itemData);
        break;
    }
  }

  /**
   * Prepare Injury item type data
   * @param {Object} itemData - The injury data object
   * @private
   */
  _prepareInjuryData(itemData) {
    // Add severity label based on numeric value
    const severity = itemData.severity?.value;
    if (severity !== undefined) {
      itemData.severity.label = severity === 1 ? "Minor" : 
                              severity === 2 ? "Major" : "Severe";
    }
  }

  /**
   * Prepare Weapon item type data
   * @param {Object} itemData - The weapon data object
   * @private
   */
  _prepareWeaponData(itemData) {
    // Any weapon-specific derivations would go here
    // For example, calculating total damage based on properties
  }

  /**
   * Prepare Armor item type data
   * @param {Object} itemData - The armor data object
   * @private
   */
  _prepareArmorData(itemData) {
    // Any armor-specific derivations would go here
    // For example, calculating effective protection based on condition
  }

  /**
   * Prepare Gear item type data
   * @param {Object} itemData - The gear data object
   * @private
   */
  _prepareGearData(itemData) {
    // Any gear-specific derivations would go here
    // For example, calculating total encumbrance based on quantity
  }

  /**
   * Prepare Consumable item type data
   * @param {Object} itemData - The consumable data object
   * @private
   */
  _prepareConsumableData(itemData) {
    // Make sure charges don't exceed max
    if (itemData.charges) {
      itemData.charges.value = Math.min(itemData.charges.value || 0, itemData.charges.max || 1);
    }
  }

  /**
   * Prepare Artifact item type data
   * @param {Object} itemData - The artifact data object
   * @private
   */
  _prepareArtifactData(itemData) {
    // Add stage description or other derived properties
    const stage = itemData.stage?.value || 0;
    itemData.stage.label = ["Dormant", "Awakening", "Ascendant", "Transcendent"][stage] || "Unknown";
  }

  /**
   * Prepare Mutation item type data
   * @param {Object} itemData - The mutation data object
   * @private
   */
  _prepareMutationData(itemData) {
    // Any mutation-specific derivations would go here
  }

  /**
   * Prepare Madness item type data
   * @param {Object} itemData - The madness data object
   * @private
   */
  _prepareMadnessData(itemData) {
    // Any madness-specific derivations would go here
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
  getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event - The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Handle different item types
    switch (item.type) {
      case "injury":
        return this._rollInjury();
      case "weapon":
        return this._rollWeapon();
      case "armor":
        return this._rollArmor();
      case "gear":
        return this._rollGear();
      case "consumable":
        return this._rollConsumable();
      case "artifact":
        return this._rollArtifact();
      case "mutation":
        return this._rollMutation();
      case "madness":
        return this._rollMadness();
      default:
        // Display item details in chat
        const chatData = {
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: `<div class="witch-iron"><h2>${item.name}</h2><p>${item.system.description || ""}</p></div>`
        };
        return ChatMessage.create(chatData);
    }
  }

  /**
   * Display injury details in chat
   */
  async _rollInjury() {
    if (!this.actor) return;

    const severity = this.system.severity.value;
    const severityLabel = (severity === 1) ? "Minor" : (severity === 2) ? "Major" : "Severe";

    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron injury-card severity-${severity}">
          <h2>${this.name}</h2>
          <div class="injury-details">
            <div class="injury-severity">${severityLabel}</div>
            <div class="injury-effect"><strong>Effect:</strong> ${this.system.effect || "None"}</div>
            <div class="injury-surgery"><strong>Surgery:</strong> ${this.system.surgery || "Not required"}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Handle weapon attacks
   */
  async _rollWeapon() {
    if (!this.actor) return;
    
    // This would implement weapon attack logic
    // For now just display weapon details
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron weapon-card">
          <h2>${this.name}</h2>
          <div class="weapon-details">
            <div><strong>Damage:</strong> ${this.system.damage.value || "None"}</div>
            <div><strong>Properties:</strong> ${this.system.properties || "None"}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Display armor details
   */
  async _rollArmor() {
    if (!this.actor) return;
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron armor-card">
          <h2>${this.name}</h2>
          <div class="armor-details">
            <div><strong>Protection:</strong> ${this.system.protection.value || 0}</div>
            <div><strong>Penalties:</strong> ${this.system.penalties || "None"}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Display gear details in chat
   */
  async _rollGear() {
    if (!this.actor) return;
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron gear-card">
          <h2>${this.name}</h2>
          <div class="gear-details">
            <div><strong>Encumbrance:</strong> ${this.system.encumbrance.value || 0}</div>
            <div class="gear-description">${this.system.description || ""}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Display consumable details in chat
   */
  async _rollConsumable() {
    if (!this.actor) return;
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron consumable-card">
          <h2>${this.name}</h2>
          <div class="consumable-details">
            <div><strong>Charges:</strong> ${this.system.charges.value || 0}/${this.system.charges.max || 1}</div>
            <div><strong>Effect:</strong> ${this.system.effect || "None"}</div>
            <div class="consumable-description">${this.system.description || ""}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Display artifact details in chat
   */
  async _rollArtifact() {
    if (!this.actor) return;
    
    const stage = this.system.stage?.value || 0;
    const stageLabel = ["Dormant", "Awakening", "Ascendant", "Transcendent"][stage] || "Unknown";
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron artifact-card">
          <h2>${this.name}</h2>
          <div class="artifact-details">
            <div><strong>Stage:</strong> ${stageLabel}</div>
            <div><strong>Lineage:</strong> ${this.system.lineage || "Unknown"}</div>
            <div class="artifact-description">${this.system.description || ""}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Display mutation details in chat
   */
  async _rollMutation() {
    if (!this.actor) return;
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron mutation-card">
          <h2>${this.name}</h2>
          <div class="mutation-details">
            <div><strong>Effect:</strong> ${this.system.effect || "None"}</div>
            <div class="mutation-description">${this.system.description || ""}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Display madness details in chat
   */
  async _rollMadness() {
    if (!this.actor) return;
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="witch-iron madness-card">
          <h2>${this.name}</h2>
          <div class="madness-details">
            <div><strong>Effect:</strong> ${this.system.effect || "None"}</div>
            <div class="madness-description">${this.system.description || ""}</div>
          </div>
        </div>
      `
    };

    return ChatMessage.create(chatData);
  }
} 