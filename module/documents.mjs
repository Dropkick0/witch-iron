/**
 * Document extension classes for the Witch Iron system
 */

/**
 * Extend the base Actor document
 * @extends {Actor}
 */
export class WitchIronActor extends Actor {
  /** @override */
  prepareData() {
    // Call the parent class's prepareData method
    super.prepareData();
    
    // Get the Actor's data
    const actorData = this.system;
    
    // Prepare data for Character type actors
    if (this.type === 'character') {
      this._prepareCharacterData(actorData);
    }
    
    // Prepare data for Enemy type actors
    if (this.type === 'enemy') {
      this._prepareEnemyData(actorData);
    }
  }
  
  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(data) {
    // Calculate ability bonuses
    for (const [key, ability] of Object.entries(data.abilities)) {
      ability.bonus = Math.floor(ability.value / 10);
    }
    
    // Calculate max encumbrance = (Muscle Bonus + Robustness Bonus) x 2
    data.secondary.maxEncumbrance = (data.abilities.muscle.bonus + data.abilities.robustness.bonus) * 2;
    
    // Calculate speed adjustments from encumbrance
    this._calculateEncumbranceEffects(data);
    
    // Calculate maximum contacts/followers based on personality bonus
    data.maxContacts = data.abilities.personality.bonus * 2;
    
    // Process injuries and determine their effects
    this._processInjuries(data);
    
    // Calculate instant access items limit (Finesse bonus)
    data.maxInstantAccess = data.abilities.finesse.bonus;
  }
  
  /**
   * Calculate encumbrance effects on a character
   */
  _calculateEncumbranceEffects(data) {
    const baseSpeed = data.secondary.speed;
    const encRatio = data.secondary.currentEncumbrance / data.secondary.maxEncumbrance;
    
    // Apply encumbrance penalties
    if (encRatio > 1 && encRatio <= 2) {
      // Past 1x Enc: 1/2 Speed, -20% to all Checks
      data.secondary.speed = Math.floor(baseSpeed / 2);
      data.encumbranceModifier = -20;
    } else if (encRatio > 2) {
      // Past 2x Enc: No Speed, -40% to all Checks
      data.secondary.speed = 0;
      data.encumbranceModifier = -40;
    } else {
      data.encumbranceModifier = 0;
    }
  }
  
  /**
   * Process injuries and determine their effects on the character
   */
  _processInjuries(data) {
    // Initialize injury count by location
    data.injuryCount = {
      head: 0,
      torso: 0,
      rightArm: 0,
      leftArm: 0,
      rightLeg: 0,
      leftLeg: 0,
      other: 0
    };
    
    // Initialize injury lists by location for the sheet
    data.headInjuries = [];
    data.torsoInjuries = [];
    data.rightArmInjuries = [];
    data.leftArmInjuries = [];
    data.rightLegInjuries = [];
    data.leftLegInjuries = [];
    
    // Flag to check if actor has injuries
    data.hasInjuries = false;
    
    // Process each injury
    if (data.injuries && data.injuries.length > 0) {
      data.hasInjuries = true;
      
      for (let i = 0; i < data.injuries.length; i++) {
        const injury = data.injuries[i];
        // Store the index for reference
        injury.id = i;
        
        // Increment the injury count for this location
        if (injury.location && data.injuryCount[injury.location] !== undefined) {
          data.injuryCount[injury.location]++;
          
          // Add to the location-specific array
          if (injury.location === 'head') {
            data.headInjuries.push(injury);
          } else if (injury.location === 'torso') {
            data.torsoInjuries.push(injury);
          } else if (injury.location === 'rightArm') {
            data.rightArmInjuries.push(injury);
          } else if (injury.location === 'leftArm') {
            data.leftArmInjuries.push(injury);
          } else if (injury.location === 'rightLeg') {
            data.rightLegInjuries.push(injury);
          } else if (injury.location === 'leftLeg') {
            data.leftLegInjuries.push(injury);
          }
        } else {
          data.injuryCount.other++;
        }
        
        // Apply injury effects based on location and severity
        this._applyInjuryEffects(data, injury);
      }
    }
  }
  
  /**
   * Apply mechanical effects of an injury based on location and severity
   * 
   * @param {object} data - The actor data
   * @param {object} injury - The injury data
   */
  _applyInjuryEffects(data, injury) {
    // Skip if the injury is treated and not permanent
    if (injury.treated && !injury.permanent) return;
    
    // Apply effects based on location and severity
    switch (injury.location) {
      case "head":
        // Head injuries affect mental abilities
        if (injury.severity >= 3) {
          if (!data.abilities.intelligence.injuryModifier) data.abilities.intelligence.injuryModifier = 0;
          if (!data.abilities.willpower.injuryModifier) data.abilities.willpower.injuryModifier = 0;
          
          data.abilities.intelligence.injuryModifier -= injury.severity * 5;
          data.abilities.willpower.injuryModifier -= injury.severity * 5;
        }
        break;
        
      case "torso":
        // Torso injuries affect robustness and constitution
        if (injury.severity >= 2) {
          if (!data.abilities.robustness.injuryModifier) data.abilities.robustness.injuryModifier = 0;
          data.abilities.robustness.injuryModifier -= injury.severity * 5;
          
          // Severe torso injuries reduce maximum attacks per round
          if (injury.severity >= 5 && data.secondary.attacks > 1) {
            data.secondary.attacks -= 1;
          }
        }
        break;
        
      case "rightArm":
      case "leftArm":
        // Arm injuries affect melee, finesse, and ranged combat
        if (!data.skills.melee.injuryModifier) data.skills.melee.injuryModifier = 0;
        data.skills.melee.injuryModifier -= injury.severity * 5;
        
        if (injury.severity >= 3) {
          if (!data.abilities.muscle.injuryModifier) data.abilities.muscle.injuryModifier = 0;
          if (!data.abilities.finesse.injuryModifier) data.abilities.finesse.injuryModifier = 0;
          
          data.abilities.muscle.injuryModifier -= injury.severity * 3;
          data.abilities.finesse.injuryModifier -= injury.severity * 5;
          
          // Dominant hand injuries affect ranged combat more
          if ((injury.location === "rightArm" && !data.leftHanded) || 
              (injury.location === "leftArm" && data.leftHanded)) {
            if (!data.skills.ranged.injuryModifier) data.skills.ranged.injuryModifier = 0;
            data.skills.ranged.injuryModifier -= injury.severity * 10;
          }
        }
        break;
        
      case "rightLeg":
      case "leftLeg":
        // Leg injuries affect movement and agility
        if (!data.abilities.agility.injuryModifier) data.abilities.agility.injuryModifier = 0;
        data.abilities.agility.injuryModifier -= injury.severity * 5;
        
        if (!data.skills.lightFoot.injuryModifier) data.skills.lightFoot.injuryModifier = 0;
        data.skills.lightFoot.injuryModifier -= injury.severity * 5;
        
        // Reduce speed based on severity
        data.secondary.speed -= injury.severity * 2;
        
        // Severe leg injuries further reduce speed and may cause prone
        if (injury.severity >= 4) {
          data.secondary.speed = Math.max(0, data.secondary.speed - 5);
        }
        break;
    }
  }
  
  /**
   * Prepare Enemy type specific data
   */
  _prepareEnemyData(data) {
    // Calculate ability bonuses for enemies
    for (const [key, ability] of Object.entries(data.abilities)) {
      ability.bonus = Math.floor(ability.value / 10);
    }
    
    // Process enemy injuries
    this._processInjuries(data);
  }
  
  /**
   * Roll an ability check
   * @param {string} abilityName - The name of the ability to roll
   * @param {object} options - Options for the roll
   * @returns {Promise<object>} - The result of the roll
   */
  async rollAbility(abilityName, options = {}) {
    // Get the ability data
    const ability = this.system.abilities[abilityName];
    if (!ability) return null;
    
    // Get the base target number (the ability value)
    let target = ability.value;
    
    // Calculate any modifiers
    let totalModifier = 0;
    
    // Include injury modifiers if they exist
    if (ability.injuryModifier) {
      totalModifier += ability.injuryModifier;
    }
    
    // Include encumbrance modifier if applicable
    if (this.system.encumbranceModifier) {
      totalModifier += this.system.encumbranceModifier;
    }
    
    // Include any additional modifiers from options
    if (options.modifier) {
      totalModifier += options.modifier;
    }
    
    // Build the roll description
    const description = options.description || `${abilityName.toUpperCase()} Check`;
    
    // Roll the ability check
    return game.witchIron.witchIronRoll(target, totalModifier, description, {
      speaker: { actor: this.id, token: this.token, alias: this.name },
      actor: this,
      ...options
    });
  }
  
  /**
   * Roll a skill check
   * @param {string} skillName - The name of the skill to roll
   * @param {string} specialization - Optional specialization for the skill
   * @param {object} options - Options for the roll
   * @returns {Promise<object>} - The result of the roll
   */
  async rollSkill(skillName, specialization = null, options = {}) {
    // Get the skill data
    const skill = this.system.skills[skillName];
    if (!skill) return null;
    
    // Determine which ability this skill is associated with
    const abilityName = this._getAbilityForSkill(skillName);
    if (!abilityName) return null;
    
    // Get the ability data
    const ability = this.system.abilities[abilityName];
    if (!ability) return null;
    
    // Get the base target number (the ability value)
    let target = ability.value;
    
    // Calculate modifiers
    let totalModifier = 0;
    
    // Add skill value as a bonus
    totalModifier += skill.value;
    
    // Check if specialization applies
    if (specialization && skill.specializations) {
      const spec = skill.specializations.find(s => s.name === specialization);
      if (spec) {
        // Apply specialization bonus
        totalModifier += spec.rating * 10; // Each rating adds +10%
      }
    }
    
    // Include injury modifiers if they exist
    if (ability.injuryModifier) {
      totalModifier += ability.injuryModifier;
    }
    
    // Include encumbrance modifier if applicable
    if (this.system.encumbranceModifier) {
      totalModifier += this.system.encumbranceModifier;
    }
    
    // Include any additional modifiers from options
    if (options.modifier) {
      totalModifier += options.modifier;
    }
    
    // Build the roll description
    const description = options.description || `${skillName.charAt(0).toUpperCase() + skillName.slice(1)} Check${specialization ? ` (${specialization})` : ''}`;
    
    // Roll the skill check
    return game.witchIron.witchIronRoll(target, totalModifier, description, {
      speaker: { actor: this.id, token: this.token, alias: this.name },
      actor: this,
      ...options
    });
  }
  
  /**
   * Get the ability associated with a skill
   * @param {string} skillName - The name of the skill
   * @returns {string|null} - The name of the associated ability
   */
  _getAbilityForSkill(skillName) {
    // Mapping of skills to abilities
    const skillAbilityMap = {
      // Muscle skills
      athletics: "muscle",
      intimidate: "muscle",
      melee: "muscle",
      
      // Robustness skills
      hardship: "robustness",
      labor: "robustness",
      imbibe: "robustness",
      
      // Agility skills
      lightFoot: "agility",
      ride: "agility",
      skulk: "agility",
      
      // Quickness skills
      cunning: "quickness",
      perception: "quickness",
      ranged: "quickness",
      
      // Finesse skills
      art: "finesse",
      operate: "finesse",
      trade: "finesse",
      
      // Intelligence skills
      heal: "intelligence",
      research: "intelligence",
      navigation: "intelligence",
      
      // Willpower skills
      steel: "willpower",
      survival: "willpower",
      husbandry: "willpower",
      
      // Personality skills
      leadership: "personality",
      carouse: "personality",
      coerce: "personality"
    };
    
    return skillAbilityMap[skillName] || null;
  }
  
  /**
   * Add an injury to the character
   * @param {object} injuryData - The injury data
   * @returns {Promise<object>} - The updated actor
   */
  async addInjury(injuryData) {
    // Ensure the injuries array exists
    const injuries = this.system.injuries || [];
    
    // Add the new injury
    const updatedInjuries = [...injuries, injuryData];
    
    // Update the actor
    return this.update({
      "system.injuries": updatedInjuries
    });
  }
  
  /**
   * Spend luck points
   * @param {number} amount - The amount of luck to spend
   * @returns {Promise<object>} - The updated actor
   */
  async spendLuck(amount) {
    const currentLuck = this.system.abilities.luck.current;
    
    // Check if there's enough luck
    if (currentLuck < amount) {
      ui.notifications.warn(`Not enough luck: ${currentLuck} < ${amount}`);
      return null;
    }
    
    // Update the actor
    return this.update({
      "system.abilities.luck.current": currentLuck - amount
    });
  }
  
  /**
   * Gain luck points
   * @param {number} amount - The amount of luck to gain
   * @returns {Promise<object>} - The updated actor
   */
  async gainLuck(amount) {
    const currentLuck = this.system.abilities.luck.current;
    
    // Update the actor
    return this.update({
      "system.abilities.luck.current": currentLuck + amount
    });
  }
  
  /**
   * Roll a skill check with specialization
   * This method handles the additional hits from skill specializations
   * 
   * @param {string} skillName - The name of the skill to roll
   * @param {string} specializationName - The name of the specialization to use
   * @param {object} options - Additional options for the roll
   * @returns {Promise<object>} - The roll result
   */
  async rollSkillWithSpecialization(skillName, specializationName, options = {}) {
    // First, roll the basic skill check
    const rollResult = await this.rollSkill(skillName, specializationName, {
      ...options,
      createMessage: false // Don't create a message yet
    });
    
    // If the roll succeeded, add additional hits from the specialization
    if (rollResult.isSuccess) {
      const skill = this.system.skills[skillName];
      if (skill && skill.specializations && skill.specializations.length > 0) {
        const specialization = skill.specializations.find(s => s.name === specializationName);
        if (specialization) {
          // Add the specialization rating to the hits
          const bonusHits = specialization.rating || 0;
          rollResult.hits += bonusHits;
          
          // Update the content with the new hits
          const modifiedContent = rollResult.content.replace(
            game.i18n.format("WITCHIRON.Messages.successWithHits", [rollResult.hits - bonusHits]),
            game.i18n.format("WITCHIRON.Messages.successWithHits", [rollResult.hits]) + 
            ` <span class="specialization-bonus">(+${bonusHits} from ${specializationName})</span>`
          );
          
          // Create a chat message with the updated content
          await ChatMessage.create({
            content: modifiedContent,
            speaker: options.speaker || ChatMessage.getSpeaker({ actor: this }),
            flavor: rollResult.description,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            roll: rollResult.roll
          });
          
          return rollResult;
        }
      }
    }
    
    // If we got here, either the roll failed or there was no specialization
    // Create the standard message
    await ChatMessage.create({
      content: rollResult.content,
      speaker: options.speaker || ChatMessage.getSpeaker({ actor: this }),
      flavor: rollResult.description,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult.roll
    });
    
    return rollResult;
  }
  
  /**
   * Perform an opposed roll against another actor
   * @param {string} abilityOrSkill - The ability or skill to use for this actor
   * @param {WitchIronActor} targetActor - The actor to oppose
   * @param {string} targetAbilityOrSkill - The ability or skill for the target actor to use
   * @param {object} options - Additional options for the roll
   * @returns {Promise<object>} - The result of the opposed roll
   */
  async rollOpposed(abilityOrSkill, targetActor, targetAbilityOrSkill, options = {}) {
    return game.witchIron.createOpposedRoll(
      this, 
      abilityOrSkill, 
      targetActor, 
      targetAbilityOrSkill, 
      options
    );
  }
  
  /**
   * Apply an injury to the actor
   * @param {string} location - The body location of the injury
   * @param {number} severity - The severity of the injury (1-10)
   * @param {string} description - Description of the injury
   * @returns {Promise<object>} - The created injury
   */
  async applyInjury(location, severity, description) {
    // Check if the location is valid
    const validLocations = ["head", "torso", "rightArm", "leftArm", "rightLeg", "leftLeg"];
    if (!validLocations.includes(location)) {
      ui.notifications.error("Invalid body location!");
      return null;
    }
    
    // Ensure severity is within range
    severity = Math.clamped(severity, 1, 10);
    
    // Create the injury data
    const injuryData = {
      location,
      severity,
      description,
      treated: false,
      permanent: false,
      timestamp: Date.now()
    };
    
    // Add the injury to the actor's injuries
    const injuries = duplicate(this.system.injuries || []);
    injuries.push(injuryData);
    
    // Update the actor
    await this.update({
      "system.injuries": injuries
    });
    
    // Get the localized body location name
    const locationName = game.i18n.localize(`WITCHIRON.BodyLocations.${location}`);
    
    // Notify about the injury
    ui.notifications.info(`${this.name} has suffered a${severity >= 5 ? ' severe' : 'n'} injury to the ${locationName}!`);
    
    // Create a chat message about the injury
    await ChatMessage.create({
      content: `
        <div class="witch-iron injury-message">
          <h3>${this.name} is injured!</h3>
          <div class="injury-details">
            <div class="injury-location">Location: ${locationName}</div>
            <div class="injury-severity">Severity: ${severity}</div>
            <div class="injury-description">${description}</div>
          </div>
        </div>
      `,
      speaker: ChatMessage.getSpeaker({actor: this}),
      flavor: `Injury: ${description}`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
    
    // Return the created injury
    return injuryData;
  }
  
  /**
   * Treat an injury
   * @param {number} injuryIndex - The index of the injury to treat
   * @returns {Promise<object>} - The updated actor
   */
  async treatInjury(injuryIndex) {
    // Copy the current injuries
    const injuries = duplicate(this.system.injuries);
    
    // Check if the injury exists
    if (!injuries[injuryIndex]) {
      ui.notifications.error("Injury not found!");
      return null;
    }
    
    // Mark as treated
    injuries[injuryIndex].treated = true;
    
    // Update the actor
    await this.update({
      "system.injuries": injuries
    });
    
    // Notify about the treatment
    const locationName = game.i18n.localize(`WITCHIRON.BodyLocations.${injuries[injuryIndex].location}`);
    ui.notifications.info(`${this.name}'s injury to the ${locationName} has been treated.`);
    
    return this;
  }
  
  /**
   * Make an injury permanent
   * @param {number} injuryIndex - The index of the injury to make permanent
   * @returns {Promise<object>} - The updated actor
   */
  async makeInjuryPermanent(injuryIndex) {
    // Copy the current injuries
    const injuries = duplicate(this.system.injuries);
    
    // Check if the injury exists
    if (!injuries[injuryIndex]) {
      ui.notifications.error("Injury not found!");
      return null;
    }
    
    // Mark as permanent
    injuries[injuryIndex].permanent = true;
    injuries[injuryIndex].treated = true; // Permanent injuries are always treated
    
    // Update the actor
    await this.update({
      "system.injuries": injuries
    });
    
    // Notify about the permanent change
    const locationName = game.i18n.localize(`WITCHIRON.BodyLocations.${injuries[injuryIndex].location}`);
    ui.notifications.info(`${this.name}'s injury to the ${locationName} has become permanent.`);
    
    return this;
  }
  
  /**
   * Delete an injury
   * @param {number} injuryIndex - The index of the injury to delete
   * @returns {Promise<object>} - The updated actor
   */
  async deleteInjury(injuryIndex) {
    // Copy the current injuries
    const injuries = duplicate(this.system.injuries);
    
    // Check if the injury exists
    if (!injuries[injuryIndex]) {
      ui.notifications.error("Injury not found!");
      return null;
    }
    
    // Remove the injury
    injuries.splice(injuryIndex, 1);
    
    // Update the actor
    await this.update({
      "system.injuries": injuries
    });
    
    return this;
  }
  
  /**
   * Perform a melee attack against a target
   * @param {object} options - Options for the attack
   * @returns {Promise<object>} - The result of the attack
   */
  async performMeleeAttack(options = {}) {
    const { initiateAttack } = await import("./combat-quarrels.mjs");
    return initiateAttack(this, "melee", options);
  }
  
  /**
   * Perform a ranged attack against a target
   * @param {object} options - Options for the attack
   * @returns {Promise<object>} - The result of the attack
   */
  async performRangedAttack(options = {}) {
    const { initiateAttack } = await import("./combat-quarrels.mjs");
    return initiateAttack(this, "ranged", options);
  }
}

/**
 * Extend the base Item document
 * @extends {Item}
 */
export class WitchIronItem extends Item {
  /** @override */
  prepareData() {
    // Call the parent class's prepareData method
    super.prepareData();
    
    // Get the Item's data
    const itemData = this.system;
    
    // Perform item type specific preparations
    if (this.type === 'weapon') {
      this._prepareWeaponData(itemData);
    }
    
    if (this.type === 'spell') {
      this._prepareSpellData(itemData);
    }
    
    if (this.type === 'artifact') {
      this._prepareArtifactData(itemData);
    }
    
    if (this.type === 'alchemical') {
      this._prepareAlchemicalData(itemData);
    }
  }
  
  /**
   * Prepare Weapon type specific data
   */
  _prepareWeaponData(data) {
    // Any weapon-specific calculations go here
  }
  
  /**
   * Prepare Spell type specific data
   */
  _prepareSpellData(data) {
    // Any spell-specific calculations go here
  }
  
  /**
   * Prepare Artifact type specific data
   */
  _prepareArtifactData(data) {
    // Any artifact-specific calculations go here
  }
  
  /**
   * Prepare Alchemical type specific data
   */
  _prepareAlchemicalData(data) {
    // Any alchemical-specific calculations go here
  }
}

/**
 * Extend the base Actor sheet
 * @extends {ActorSheet}
 */
export class WitchIronActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "actor"],
      template: "systems/witch-iron/templates/actor-sheet.html",
      width: 700,
      height: 800,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "abilities" },
        { navSelector: ".injuries-tabs", contentSelector: ".injuries-body", initial: "active" }
      ]
    });
  }
  
  /** @override */
  get template() {
    return `systems/witch-iron/templates/actor-${this.actor.type}-sheet.html`;
  }
  
  /** @override */
  getData() {
    // Basic data
    const context = super.getData();
    
    // Add the actor's data to context.data for easier access
    context.system = context.data.system;
    
    // Add ability list
    context.abilities = Object.entries(context.system.abilities).map(([key, ability]) => {
      return {
        id: key,
        label: game.i18n.localize(`WITCHIRON.Ability.${key}`),
        value: ability.value,
        bonus: ability.bonus
      };
    });
    
    // Add skills list organized by ability
    context.skillsByAbility = this._prepareSkillsByAbility(context.system.skills);
    
    // Process Lineages
    context.availableLineages = game.settings.get("witch-iron", "enabledLineages");
    
    // Add character specific data
    if (this.actor.type === 'character') {
      this._prepareCharacterItems(context);
      this._prepareCharacterSheetData(context);
    }
    
    // Add enemy specific data
    if (this.actor.type === 'enemy') {
      this._prepareEnemySheetData(context);
    }
    
    return context;
  }
  
  /**
   * Organize skills by their associated ability
   * @param {object} skills - The skills data
   * @returns {object} - Skills organized by ability
   */
  _prepareSkillsByAbility(skills) {
    const skillsByAbility = {
      muscle: [],
      robustness: [],
      agility: [],
      quickness: [],
      finesse: [],
      intelligence: [],
      willpower: [],
      personality: []
    };
    
    for (const [key, skill] of Object.entries(skills)) {
      const abilityName = this.actor._getAbilityForSkill(key);
      if (abilityName && skillsByAbility[abilityName]) {
        skillsByAbility[abilityName].push({
          id: key,
          label: game.i18n.localize(`WITCHIRON.Skill.${key}`),
          value: skill.value,
          specializations: skill.specializations || []
        });
      }
    }
    
    return skillsByAbility;
  }
  
  /**
   * Prepare character sheet specific data
   * @param {object} context - The sheet data context
   */
  _prepareCharacterSheetData(context) {
    // Additional character sheet specific data
    
    // Process injuries
    context.activeInjuries = context.system.injuries.filter(i => !i.treated);
    context.treatedInjuries = context.system.injuries.filter(i => i.treated && !i.permanent);
    context.permanentInjuries = context.system.injuries.filter(i => i.permanent);
    
    // Process lineage
    context.primaryLineage = context.system.lineage.primary;
    context.secondaryLineage = context.system.lineage.secondary;
    context.finalLineage = context.system.lineage.final;
    
    // Process genetic traits
    context.geneticTraits = context.system.geneticTraits;
  }
  
  /**
   * Prepare enemy sheet specific data
   * @param {object} context - The sheet data context
   */
  _prepareEnemySheetData(context) {
    // Additional enemy sheet specific data
    
    // Process injuries
    context.activeInjuries = context.system.injuries.filter(i => !i.treated);
    context.treatedInjuries = context.system.injuries.filter(i => i.treated);
    
    // Process attacks
    context.attacks = context.system.attacks;
    
    // Process special abilities
    context.specialAbilities = context.system.specialAbilities;
  }
  
  /**
   * Organize and classify Items for Character sheets
   * @param {Object} context The sheet data context
   */
  _prepareCharacterItems(context) {
    // Initialize containers
    const weapons = [];
    const spells = [];
    const artifacts = [];
    const alchemicals = [];
    const equipment = [];
    
    // Organize items by type
    for (let i of context.items) {
      if (i.type === 'weapon') {
        weapons.push(i);
      } else if (i.type === 'spell') {
        spells.push(i);
      } else if (i.type === 'artifact') {
        artifacts.push(i);
      } else if (i.type === 'alchemical') {
        alchemicals.push(i);
      } else {
        equipment.push(i);
      }
    }
    
    // Sort weapons by instant access for easy reference
    weapons.sort((a, b) => {
      if (a.system.instantAccess && !b.system.instantAccess) return -1;
      if (!a.system.instantAccess && b.system.instantAccess) return 1;
      return 0;
    });
    
    // Assign items to the context
    context.weapons = weapons;
    context.spells = spells;
    context.artifacts = artifacts;
    context.alchemicals = alchemicals;
    context.equipment = equipment;
    
    // Count encumbrance
    let totalEncumbrance = 0;
    for (const item of [...weapons, ...artifacts, ...alchemicals, ...equipment]) {
      if (item.system.encumbrance) {
        totalEncumbrance += item.system.encumbrance;
      }
    }
    
    context.totalEncumbrance = totalEncumbrance;
  }
  
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    
    // Initialize tabs
    const tabs = html.find('.tabs');
    const tabsInstance = new Tabs(tabs[0]);
    tabsInstance.bind(html[0]);
    
    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));
    
    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });
    
    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.delete();
        li.slideUp(200, () => this.render(false));
      }
    });
    
    // Ability/Skill checks
    html.find('.ability-name').click(this._onRollAbility.bind(this));
    html.find('.skill-roll').click(this._onRollSkill.bind(this));
    
    // Attack actions
    html.find('.melee-attack').click(this._onMeleeAttack.bind(this));
    html.find('.ranged-attack').click(this._onRangedAttack.bind(this));
    
    // Injuries management
    html.find('.treat-injury').click(this._onTreatInjury.bind(this));
    html.find('.permanent-injury').click(this._onMakeInjuryPermanent.bind(this));
    html.find('.delete-injury').click(this._onDeleteInjury.bind(this));
    html.find('.add-injury').click(this._onAddInjury.bind(this));
    
    // Location map interactions
    html.find('.location-container').click(this._onLocationClick.bind(this));
  }
  
  /**
   * Handle creating a new Inventory item for the actor
   * @param {Event} event - The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create
    const type = header.dataset.type;
    // Initialize a default name
    const name = `New ${type.capitalize()}`;
    // Create the item
    const itemData = {
      name: name,
      type: type,
      system: {}
    };
    
    // Handle specific item defaults
    if (type === "weapon") {
      itemData.system = {
        damage: "1d6",
        damageType: "physical",
        weight: 1,
        qualities: []
      };
    }
    
    await Item.create(itemData, { parent: this.actor });
  }
  
  /**
   * Handle rolling an ability check
   * @param {Event} event - The originating click event
   * @private
   */
  _onRollAbility(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const ability = element.dataset.ability;
    this.actor.rollAbility(ability);
  }
  
  /**
   * Handle rolling a skill check
   * @param {Event} event - The originating click event
   * @private
   */
  _onRollSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skill = element.dataset.skill;
    this.actor.rollSkill(skill);
  }
  
  /**
   * Handle a melee attack action
   * @param {Event} event - The originating click event
   * @private
   */
  async _onMeleeAttack(event) {
    event.preventDefault();
    await this.actor.performMeleeAttack();
  }
  
  /**
   * Handle a ranged attack action
   * @param {Event} event - The originating click event
   * @private
   */
  async _onRangedAttack(event) {
    event.preventDefault();
    await this.actor.performRangedAttack();
  }
  
  /**
   * Handle treating an injury
   * @param {Event} event - The originating click event
   * @private
   */
  async _onTreatInjury(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const injuryId = element.dataset.injuryId;
    
    // Call the treatInjury method on the actor
    await this.actor.treatInjury(injuryId);
    this.render(true);
  }
  
  /**
   * Handle making an injury permanent
   * @param {Event} event - The originating click event
   * @private
   */
  async _onMakeInjuryPermanent(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const injuryId = element.dataset.injuryId;
    
    // Call the makeInjuryPermanent method on the actor
    await this.actor.makeInjuryPermanent(injuryId);
    this.render(true);
  }
  
  /**
   * Handle deleting an injury
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteInjury(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const injuryId = element.dataset.injuryId;
    
    // Confirm deletion
    const confirmDelete = await Dialog.confirm({
      title: "Delete Injury",
      content: "<p>Are you sure you want to delete this injury? This cannot be undone.</p>",
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    
    if (confirmDelete) {
      // Call the deleteInjury method on the actor
      await this.actor.deleteInjury(injuryId);
      this.render(true);
    }
  }
  
  /**
   * Handle adding a new injury
   * @param {Event} event - The originating click event
   * @private
   */
  _onAddInjury(event) {
    event.preventDefault();
    
    new Dialog({
      title: "Add Injury",
      content: `
        <form>
          <div class="form-group">
            <label>Body Location:</label>
            <select name="location">
              <option value="head">Head</option>
              <option value="torso">Torso</option>
              <option value="rightArm">Right Arm</option>
              <option value="leftArm">Left Arm</option>
              <option value="rightLeg">Right Leg</option>
              <option value="leftLeg">Left Leg</option>
            </select>
          </div>
          <div class="form-group">
            <label>Injury Severity:</label>
            <input type="number" name="severity" value="1" min="1" max="10">
          </div>
          <div class="form-group">
            <label>Injury Description:</label>
            <input type="text" name="description" value="Combat Wound">
          </div>
        </form>
      `,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add Injury",
          callback: html => {
            const form = html.find('form')[0];
            const location = form.elements.location.value;
            const severity = parseInt(form.elements.severity.value);
            const description = form.elements.description.value;
            
            this.actor.applyInjury(location, severity, description);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "add"
    }).render(true);
  }
  
  /**
   * Handle clicking on a body location in the map
   * @param {Event} event - The originating click event
   * @private
   */
  _onLocationClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const location = element.dataset.location;
    
    // Offer a menu of actions for this location
    const locationName = game.i18n.localize(`WITCHIRON.BodyLocations.${location}`);
    
    const locationMenu = [
      {
        name: `Add Injury to ${locationName}`,
        icon: '<i class="fas fa-plus"></i>',
        callback: () => this._promptAddInjuryToLocation(location)
      }
    ];
    
    // Get injuries for this location
    const locationInjuries = this.actor.system.injuries.filter(i => i.location === location);
    
    if (locationInjuries.length > 0) {
      locationMenu.push({
        name: `View Injuries (${locationInjuries.length})`,
        icon: '<i class="fas fa-search"></i>',
        callback: () => this._viewLocationInjuries(location, locationInjuries)
      });
    }
    
    // Show the menu
    const menu = new ContextMenu(
      $(element),
      locationMenu
    );
    menu.render(true);
  }
  
  /**
   * Prompt to add an injury to a specific location
   * @param {string} location - The body location
   * @private
   */
  _promptAddInjuryToLocation(location) {
    const locationName = game.i18n.localize(`WITCHIRON.BodyLocations.${location}`);
    
    new Dialog({
      title: `Add Injury to ${locationName}`,
      content: `
        <form>
          <div class="form-group">
            <label>Injury Severity:</label>
            <input type="number" name="severity" value="1" min="1" max="10">
          </div>
          <div class="form-group">
            <label>Injury Description:</label>
            <input type="text" name="description" value="Combat Wound">
          </div>
        </form>
      `,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add Injury",
          callback: html => {
            const form = html.find('form')[0];
            const severity = parseInt(form.elements.severity.value);
            const description = form.elements.description.value;
            
            this.actor.applyInjury(location, severity, description);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "add"
    }).render(true);
  }
  
  /**
   * View and manage injuries for a specific location
   * @param {string} location - The body location
   * @param {Array} injuries - The injuries at this location
   * @private
   */
  _viewLocationInjuries(location, injuries) {
    const locationName = game.i18n.localize(`WITCHIRON.BodyLocations.${location}`);
    
    // Create injury list HTML
    let injuryList = `<ul class="location-injuries-list">`;
    for (const injury of injuries) {
      const treated = injury.treated ? 'treated' : '';
      const permanent = injury.permanent ? 'permanent' : '';
      injuryList += `
        <li class="injury-item ${treated} ${permanent}" data-injury-id="${injury.id}">
          <span class="injury-name">${injury.description}</span>
          <span class="injury-severity">(Severity ${injury.severity})</span>
          <div class="injury-actions">
            ${!injury.treated ? `<button class="treat-injury-button" data-injury-id="${injury.id}"><i class="fas fa-medkit"></i></button>` : ''}
            ${!injury.permanent ? `<button class="permanent-injury-button" data-injury-id="${injury.id}"><i class="fas fa-skull"></i></button>` : ''}
            <button class="delete-injury-button" data-injury-id="${injury.id}"><i class="fas fa-trash"></i></button>
          </div>
        </li>
      `;
    }
    injuryList += `</ul>`;
    
    new Dialog({
      title: `${locationName} Injuries`,
      content: injuryList,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      },
      render: html => {
        // Add event listeners for the buttons
        html.find('.treat-injury-button').click(async ev => {
          const injuryId = ev.currentTarget.dataset.injuryId;
          await this.actor.treatInjury(injuryId);
          this.render(true);
          Dialog.fromEvent(ev).close();
        });
        
        html.find('.permanent-injury-button').click(async ev => {
          const injuryId = ev.currentTarget.dataset.injuryId;
          await this.actor.makeInjuryPermanent(injuryId);
          this.render(true);
          Dialog.fromEvent(ev).close();
        });
        
        html.find('.delete-injury-button').click(async ev => {
          const injuryId = ev.currentTarget.dataset.injuryId;
          const confirm = await Dialog.confirm({
            title: "Delete Injury",
            content: "<p>Are you sure you want to delete this injury? This cannot be undone.</p>",
            yes: () => true,
            no: () => false,
            defaultYes: false
          });
          
          if (confirm) {
            await this.actor.deleteInjury(injuryId);
            this.render(true);
            Dialog.fromEvent(ev).close();
          }
        });
      }
    }).render(true);
  }
}

/**
 * Extend the base Item sheet
 * @extends {ItemSheet}
 */
export class WitchIronItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }
  
  /** @override */
  get template() {
    return `systems/witch-iron/templates/item-${this.item.type}-sheet.html`;
  }
  
  /** @override */
  getData() {
    // Basic data
    const context = super.getData();
    
    // Add the item's data to context.data for easier access
    context.system = context.data.system;
    
    // Add item type specific data
    if (this.item.type === 'weapon') {
      this._prepareWeaponSheetData(context);
    } else if (this.item.type === 'spell') {
      this._prepareSpellSheetData(context);
    } else if (this.item.type === 'artifact') {
      this._prepareArtifactSheetData(context);
    } else if (this.item.type === 'alchemical') {
      this._prepareAlchemicalSheetData(context);
    }
    
    return context;
  }
  
  /**
   * Prepare weapon sheet specific data
   * @param {object} context - The sheet data context
   */
  _prepareWeaponSheetData(context) {
    // Add weapon specific data
    context.weaponTypes = ["melee", "ranged", "thrown"];
    context.classifications = ["yeoman", "dockside", "common", "aristocratic", "battlefield", "tournament", "frontier", "urban", "prototype"];
    context.damageTypes = CONFIG.WITCHIRON.damageTypes;
    context.availableLineages = game.settings.get("witch-iron", "enabledLineages");
  }
  
  /**
   * Prepare spell sheet specific data
   * @param {object} context - The sheet data context
   */
  _prepareSpellSheetData(context) {
    // Add spell specific data
    context.spellTypes = ["arcane", "miracle", "rune"];
    context.availableLineages = game.settings.get("witch-iron", "enabledLineages");
  }
  
  /**
   * Prepare artifact sheet specific data
   * @param {object} context - The sheet data context
   */
  _prepareArtifactSheetData(context) {
    // Add artifact specific data
    context.stages = [1, 2, 3];
    context.availableLineages = game.settings.get("witch-iron", "enabledLineages");
  }
  
  /**
   * Prepare alchemical sheet specific data
   * @param {object} context - The sheet data context
   */
  _prepareAlchemicalSheetData(context) {
    // Add alchemical specific data
    context.itemTypes = ["potion", "poison", "reagent", "explosive"];
  }
  
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;
    
    // Initialize tabs
    const tabs = html.find('.tabs');
    const tabsInstance = new Tabs(tabs[0]);
    tabsInstance.bind(html[0]);
    
    // Add event handlers for item specific controls
    if (this.item.type === 'weapon') {
      // Weapon specific listeners
    } else if (this.item.type === 'spell') {
      // Spell specific listeners
    } else if (this.item.type === 'artifact') {
      // Artifact specific listeners
      html.find('.add-power').click(this._onAddPower.bind(this));
      html.find('.delete-power').click(this._onDeletePower.bind(this));
    } else if (this.item.type === 'alchemical') {
      // Alchemical specific listeners
      html.find('.add-ingredient').click(this._onAddIngredient.bind(this));
      html.find('.delete-ingredient').click(this._onDeleteIngredient.bind(this));
    }
  }
  
  /**
   * Handle adding a power to an artifact
   * @param {Event} event - The click event
   * @private
   */
  async _onAddPower(event) {
    event.preventDefault();
    
    const powers = duplicate(this.item.system.powers || []);
    powers.push({
      name: "New Power",
      description: "",
      cost: ""
    });
    
    await this.item.update({"system.powers": powers});
  }
  
  /**
   * Handle deleting a power from an artifact
   * @param {Event} event - The click event
   * @private
   */
  async _onDeletePower(event) {
    event.preventDefault();
    const powerIdx = event.currentTarget.dataset.powerIdx;
    const powers = duplicate(this.item.system.powers || []);
    
    if (powers[powerIdx]) {
      powers.splice(powerIdx, 1);
      await this.item.update({"system.powers": powers});
    }
  }
  
  /**
   * Handle adding an ingredient to an alchemical item
   * @param {Event} event - The click event
   * @private
   */
  async _onAddIngredient(event) {
    event.preventDefault();
    
    const ingredients = duplicate(this.item.system.ingredients || []);
    
    // Create dialog for ingredient input
    const dialog = new Dialog({
      title: "Add Ingredient",
      content: `
        <form>
          <div class="form-group">
            <label>Ingredient:</label>
            <input type="text" name="ingredient" value="">
          </div>
        </form>
      `,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: html => {
            const ingredient = html.find('[name="ingredient"]').val();
            ingredients.push(ingredient);
            this.item.update({"system.ingredients": ingredients});
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "add"
    });
    
    dialog.render(true);
  }
  
  /**
   * Handle deleting an ingredient from an alchemical item
   * @param {Event} event - The click event
   * @private
   */
  async _onDeleteIngredient(event) {
    event.preventDefault();
    const ingredientIdx = event.currentTarget.dataset.ingredientIdx;
    const ingredients = duplicate(this.item.system.ingredients || []);
    
    if (ingredients[ingredientIdx]) {
      ingredients.splice(ingredientIdx, 1);
      await this.item.update({"system.ingredients": ingredients});
    }
  }
}

// Register sheet application classes
Actors.registerSheet("witch-iron", WitchIronActorSheet, { makeDefault: true });
Items.registerSheet("witch-iron", WitchIronItemSheet, { makeDefault: true }); 