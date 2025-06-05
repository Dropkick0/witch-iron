// Suppress console.log override for debugging; remove this line to restore logging
// console.log = () => {};

/**
 * Extends the base Actor class for Witch Iron actors.
 * @extends {Actor}
 */
export class WitchIronActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare base data, then type-specific data
    super.prepareData();

    const actorData = this;
    const systemData = actorData.system;
    
    // Initialize flags if not present
    if (!systemData.flags) {
//////       console.log(`Initializing system.flags for actor ${this.name}`);
      systemData.flags = {};
    }
    
    // Always initialize skills data regardless of actor type
    this._prepareSkillsData(actorData);
    
    // Log actor type for debugging
//////     console.log(`Preparing data for actor ${this.name} with type: ${this.type}`);
    
    // Prepare specific actor type data
    if (this.type === 'monster') {
//////       console.log(`Preparing monster data for ${this.name}`);
      this._prepareMonsterData(actorData);
    } else if (this.type === 'descendant') {
      this._prepareDescendantData(actorData);
    } else {
      // Default to monster if type is not recognized but has monster properties
      if (systemData.stats?.hitDice) {
        console.warn(`Actor ${this.name} has monster stats but type "${this.type}", preparing as monster`);
        this._prepareMonsterData(actorData);
      } else {
        console.warn(`Actor ${this.name} has unrecognized type "${this.type}", preparing as descendant`);
        this._prepareDescendantData(actorData);
      }
    }
  }
  
  // Ensure the data structure for skills is up-to-date
  _prepareSkillsData(actorData) {
    const systemData = actorData.system;
    
    // Initialize the skills object with proper structure
    if (!systemData.skills) {
      systemData.skills = {};
    }
    
    // Ensure all skill categories exist
    if (!systemData.skills.combat) systemData.skills.combat = {};
    if (!systemData.skills.physical) systemData.skills.physical = {};
    if (!systemData.skills.social) systemData.skills.social = {};
    if (!systemData.skills.quickness) systemData.skills.quickness = {};
    if (!systemData.skills.mental) systemData.skills.mental = {};
    
    // Combat skills
    if (!systemData.skills.combat.athletics) {
      systemData.skills.combat.athletics = { value: 0, ability: "muscle", label: "Athletics", specializations: [] };
    }
    if (!systemData.skills.combat.intimidate) {
      systemData.skills.combat.intimidate = { value: 0, ability: "muscle", label: "Intimidate", specializations: [] };
    }
    if (!systemData.skills.combat.melee) {
      systemData.skills.combat.melee = { value: 0, ability: "muscle", label: "Melee", specializations: [] };
    }
    
    // Physical skills
    if (!systemData.skills.physical.hardship) {
      systemData.skills.physical.hardship = { value: 0, ability: "robustness", label: "Hardship", specializations: [] };
    }
    if (!systemData.skills.physical.labor) {
      systemData.skills.physical.labor = { value: 0, ability: "robustness", label: "Labor", specializations: [] };
    }
    if (!systemData.skills.physical.imbibe) {
      systemData.skills.physical.imbibe = { value: 0, ability: "robustness", label: "Imbibe", specializations: [] };
    }
    if (!systemData.skills.physical.lightfoot) {
      systemData.skills.physical.lightfoot = { value: 0, ability: "agility", label: "Lightfoot", specializations: [] };
    }
    if (!systemData.skills.physical.ride) {
      systemData.skills.physical.ride = { value: 0, ability: "agility", label: "Ride", specializations: [] };
    }
    if (!systemData.skills.physical.skulk) {
      systemData.skills.physical.skulk = { value: 0, ability: "agility", label: "Skulk", specializations: [] };
    }
    
    // Quickness skills
    if (!systemData.skills.quickness.cunning) {
      systemData.skills.quickness.cunning = { value: 0, ability: "quickness", label: "Cunning", specializations: [] };
    }
    if (!systemData.skills.quickness.perception) {
      systemData.skills.quickness.perception = { value: 0, ability: "quickness", label: "Perception", specializations: [] };
    }
    if (!systemData.skills.quickness.ranged) {
      systemData.skills.quickness.ranged = { value: 0, ability: "quickness", label: "Ranged", specializations: [] };
    }

    // Social skills
    if (!systemData.skills.social.leadership) {
      systemData.skills.social.leadership = { value: 0, ability: "personality", label: "Leadership", specializations: [] };
    }
    if (!systemData.skills.social.carouse) {
      systemData.skills.social.carouse = { value: 0, ability: "personality", label: "Carouse", specializations: [] };
    }
    if (!systemData.skills.social.coerce) {
      systemData.skills.social.coerce = { value: 0, ability: "personality", label: "Coerce", specializations: [] };
    }
    
    // Mental skills
    if (!systemData.skills.mental.art) {
      systemData.skills.mental.art = { value: 0, ability: "finesse", label: "Art", specializations: [] };
    }
    if (!systemData.skills.mental.operate) {
      systemData.skills.mental.operate = { value: 0, ability: "finesse", label: "Operate", specializations: [] };
    }
    if (!systemData.skills.mental.trade) {
      systemData.skills.mental.trade = { value: 0, ability: "finesse", label: "Trade", specializations: [] };
    }
    if (!systemData.skills.mental.heal) {
      systemData.skills.mental.heal = { value: 0, ability: "intellect", label: "Heal", specializations: [] };
    }
    if (!systemData.skills.mental.research) {
      systemData.skills.mental.research = { value: 0, ability: "intellect", label: "Research", specializations: [] };
    }
    if (!systemData.skills.mental.navigation) {
      systemData.skills.mental.navigation = { value: 0, ability: "intellect", label: "Navigation", specializations: [] };
    }
    if (!systemData.skills.mental.steel) {
      systemData.skills.mental.steel = { value: 0, ability: "willpower", label: "Steel", specializations: [] };
    }
    if (!systemData.skills.mental.survival) {
      systemData.skills.mental.survival = { value: 0, ability: "willpower", label: "Survival", specializations: [] };
    }
    if (!systemData.skills.mental.husbandry) {
      systemData.skills.mental.husbandry = { value: 0, ability: "willpower", label: "Husbandry", specializations: [] };
    }
    
    // Ensure all skills have the specializations array
    for (const category of ["combat", "physical", "quickness", "social", "mental"]) {
      for (const skillKey in systemData.skills[category]) {
        if (!systemData.skills[category][skillKey].specializations) {
          systemData.skills[category][skillKey].specializations = [];
        }
      }
    }
  }

  /**
   * Prepares Descendant-type actor data.
   * @param {Object} actorData The actor data being prepared.
   */
  _prepareDescendantData(actorData) {
    const systemData = actorData.system;
    
    // Ensure all required data structures exist
    if (!systemData.attributes) systemData.attributes = {};
    if (!systemData.resources) systemData.resources = {};
    if (!systemData.derived) systemData.derived = {};
    if (!systemData.modifiers) systemData.modifiers = {};
    if (!systemData.choices) systemData.choices = {};
    if (!systemData.derivedFlags) systemData.derivedFlags = {};
    
    // Make sure to prepare skills first
    this._prepareSkillsData(actorData);
    
    // Default modifiers to 0 if not set
    systemData.modifiers.custom = systemData.modifiers.custom || 0;
    
    // Initialize resources if not set
    if (!systemData.resources.encumbrance) {
      systemData.resources.encumbrance = { current: 0, max: 0, doublemax: 0 };
    }
    
    if (!systemData.resources.xp) {
      systemData.resources.xp = { value: 0 };
    }
    
    if (!systemData.resources.faith) {
      systemData.resources.faith = { value: 0 };
    }
    
    if (!systemData.resources.magick) {
      systemData.resources.magick = { value: 0 };
    }
    
    // Ensure the magic/faith choice is set
    systemData.choices.magfaith = systemData.choices.magfaith || "notselected";
    
    // Initialize all attributes if not set
    const attributes = CONFIG.WITCH_IRON.attributes;
    for (const [key, label] of Object.entries(attributes)) {
      if (!systemData.attributes[key]) {
        systemData.attributes[key] = { value: 40 }; // Default to 40
      }
    }
    
    // Calculate attribute bonuses
    for (const [key, attr] of Object.entries(systemData.attributes)) {
      attr.bonus = Math.floor(attr.value / 10);
    }
    
    // Calculate encumbrance limits
    const muscleBonus = systemData.attributes.muscle.bonus || 0;
    const robustnessBonus = systemData.attributes.robustness.bonus || 0;
    
    systemData.resources.encumbrance.max = (muscleBonus + robustnessBonus) * 2;
    systemData.resources.encumbrance.doublemax = systemData.resources.encumbrance.max * 2;
    
    // Set speed (base 30 + 5 for every 40 points in Agility)
    const agilityValue = systemData.attributes.agility.value || 0;
    systemData.derived.speed = 30 + (Math.floor(agilityValue / 40) * 5);
    
    // Calculate global modifier
    const encPenalty = systemData.resources.encumbrance.current > systemData.resources.encumbrance.doublemax ? -40 :
                      systemData.resources.encumbrance.current > systemData.resources.encumbrance.max ? -20 : 0;
    
    systemData.modifiers.global = (systemData.modifiers.custom || 0) + encPenalty;
    
    // Calculate tier from XP
    const xp = systemData.resources.xp.value;
    systemData.derived.tier = xp < 400 ? 0 : 
                             xp < 1200 ? 1 : 
                             xp < 2800 ? 2 : 
                             xp < 6000 ? 3 : 
                             xp < 12400 ? 4 : 
                             xp < 25200 ? 5 : 
                             xp < 50800 ? 6 : 
                             xp < 102000 ? 7 : 
                             xp < 204400 ? 8 : 
                             xp < 409200 ? 9 : 10;
    
    // Calculate literacy based on intellect
    const intellectValue = systemData.attributes.intellect?.value || 0;
    systemData.derivedFlags.canReadWrite = intellectValue >= 40;

    // Initialize common conditions
    const condList = ["blind", "deaf", "pain"];
    if (!systemData.conditions) systemData.conditions = {};
    for (const key of condList) {
      if (!systemData.conditions[key] || typeof systemData.conditions[key]?.value !== 'number') {
        systemData.conditions[key] = { value: 0 };
      }
    }
  }

  /**
   * Prepare monster-type actor data
   * @param {Object} actorData Actor data being prepared
   * @private
   */
  _prepareMonsterData(actorData) {
    const systemData = actorData.system;

    // Debug log for incoming data
//////     console.log("_prepareMonsterData - Actor Data:", actorData);
//////     console.log("_prepareMonsterData - System Data:", systemData);

    // Ensure basic data structure exists
    if (!systemData.stats) systemData.stats = {};
    
    // Setup Hit Dice
    if (!systemData.stats.hitDice) systemData.stats.hitDice = { value: 1 };
    else if (typeof systemData.stats.hitDice !== 'object') {
      // Handle case where hitDice might be a primitive
      systemData.stats.hitDice = { value: Number(systemData.stats.hitDice) || 1 };
    }
    // Make sure hitDice.value is a number
    systemData.stats.hitDice.value = Number(systemData.stats.hitDice.value) || 1;
    
    // Setup Size
    if (!systemData.stats.size) systemData.stats.size = { value: "medium" };
    else if (typeof systemData.stats.size !== 'object') {
      systemData.stats.size = { value: systemData.stats.size || "medium" };
    }
    // Ensure size has a valid value
    if (!["tiny", "small", "medium", "large", "huge", "gigantic"].includes(systemData.stats.size.value)) {
      systemData.stats.size.value = "medium";
    }
    
    // Setup Weapon Type
    if (!systemData.stats.weaponType) systemData.stats.weaponType = { value: "unarmed" };
    else if (typeof systemData.stats.weaponType !== 'object') {
      systemData.stats.weaponType = { value: systemData.stats.weaponType || "unarmed" };
    }
    // Ensure weapon type has a valid value
    if (!["unarmed", "light", "medium", "heavy", "superheavy"].includes(systemData.stats.weaponType.value)) {
      systemData.stats.weaponType.value = "unarmed";
    }
    
    // Setup Armor Type
    if (!systemData.stats.armorType) systemData.stats.armorType = { value: "none" };
    else if (typeof systemData.stats.armorType !== 'object') {
      systemData.stats.armorType = { value: systemData.stats.armorType || "none" };
    }
    // Ensure armor type has a valid value
    if (!["none", "light", "medium", "heavy", "superheavy"].includes(systemData.stats.armorType.value)) {
      systemData.stats.armorType.value = "none";
    }
    
    if (!systemData.derived) systemData.derived = {};
    if (!systemData.mob) systemData.mob = { isMob: { value: false }, bodies: { value: 0 }, formation: { value: "skirmish" } };
    if (!systemData.mob.formation) systemData.mob.formation = { value: "skirmish" };
    if (!systemData.traits) systemData.traits = { specialQualities: [], flaw: { value: "" } };
    
    // Monster ability score based on Hit Dice from V3 table
    // Make sure to cast to number in case it's stored as string
    const hdValue = Number(systemData.stats.hitDice.value) || 1;
//////     console.log(`Monster HD Value: ${hdValue} (type: ${typeof hdValue})`);
    
    const abilityScoreByHD = {
      1: 30, 2: 33, 3: 40, 4: 44, 5: 50, 
      6: 55, 7: 60, 8: 66, 9: 70, 10: 77,
      11: 80, 12: 88, 13: 90, 14: 99, 15: 100,
      16: 105, 17: 110, 18: 115, 19: 120, 20: 125
    };

    // Calculate base ability score from Hit Dice
    const baseAbilityScore = abilityScoreByHD[hdValue] || 30; // Default to 1HD if invalid
//////     console.log(`Calculated Base Ability Score: ${baseAbilityScore} for HD: ${hdValue}`);
    
    // Store in derived values - Force this to be a number
    systemData.derived.abilityScore = Number(baseAbilityScore);
//////     console.log(`Set ability score: ${systemData.derived.abilityScore} (type: ${typeof systemData.derived.abilityScore})`);
    
    // +Hits by Hit Dice for checks the monster is good at
    const plusHitsByHD = {
      1: 1, 2: 1, 3: 1, 4: 2, 5: 2,
      6: 2, 7: 3, 8: 3, 9: 3, 10: 4,
      11: 4, 12: 4, 13: 5, 14: 5, 15: 5,
      16: 6, 17: 6, 18: 6, 19: 7, 20: 7
    };

    // Size modifiers to damage and soak
    const sizeModifiers = {
      "tiny": -5,
      "small": -2,
      "medium": 0,
      "large": 5,
      "huge": 10,
      "gigantic": 20,
      "gargantuan": 20 // Support both terms for consistency
    };
    
    // Weapon and armor values
    const weaponDamage = {
      "light": 4,
      "medium": 6,
      "heavy": 8,
      "superheavy": 10,
      "unarmed": 2
    };

    const armorValue = {
      "none": 0,
      "light": 2,
      "medium": 4,
      "heavy": 6,
      "superheavy": 8
    };
    
    const sizeModifier = sizeModifiers[systemData.stats.size.value] || 0;
    const weaponBonus = weaponDamage[systemData.stats.weaponType.value] || 0;
    const armorBonus = armorValue[systemData.stats.armorType.value] || 0;
    
//////     console.log(`Size Modifier: ${sizeModifier} for size: ${systemData.stats.size.value}`);
//////     console.log(`Weapon Bonus: ${weaponBonus} for weapon: ${systemData.stats.weaponType.value}`);
//////     console.log(`Armor Bonus: ${armorBonus} for armor: ${systemData.stats.armorType.value}`);

    // Final calculated values
    const plusHits = plusHitsByHD[hdValue] || 1;
    
//////     console.log(`Calculated plus hits: ${plusHits}`);

    // Calculate ability bonuses (used in rolls)
    const abilityBonus = Math.floor(systemData.derived.abilityScore / 10);
//////     console.log(`Calculated ability bonus: ${abilityBonus}`);

    // Calculate base values with minimum 1 before adding weapon/armor
    const baseDamage = Math.max(1, abilityBonus + sizeModifier);
    const baseSoak = Math.max(1, abilityBonus + sizeModifier);
//////     console.log(`Base damage (ability bonus + size, min 1): ${baseDamage}`);
//////     console.log(`Base soak (ability bonus + size, min 1): ${baseSoak}`);
    
    // Add weapon and armor bonuses
    // Initialize battle wear if needed
    const ARMOR_LOCATIONS = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];

    if (!systemData.battleWear) {
        systemData.battleWear = { weapon: { value: 0 }, armor: {} };
    }

    if (!systemData.battleWear.weapon) systemData.battleWear.weapon = { value: 0 };
    if (!systemData.battleWear.armor) systemData.battleWear.armor = {};

    for (const loc of ARMOR_LOCATIONS) {
        if (typeof systemData.battleWear.armor[loc]?.value !== 'number') {
            systemData.battleWear.armor[loc] = { value: 0 };
        }
    }
    
    // Always reset battle wear to 0 for new monsters
    if (this.isNew) {
        systemData.battleWear.weapon.value = 0;
        for (const loc of ARMOR_LOCATIONS) {
            systemData.battleWear.armor[loc].value = 0;
        }
//////         console.log(`Initializing battle wear to 0 for new monster: ${this.name}`);
    }

    // Get battle wear values
    const weaponWear = Number(systemData.battleWear?.weapon?.value || 0);
    const armorWear = {};
    for (const loc of ARMOR_LOCATIONS) {
        armorWear[loc] = Number(systemData.battleWear.armor[loc]?.value || 0);
    }

    // Calculate effective bonuses after battle wear
    const effectiveWeaponBonus = Math.max(0, weaponBonus - weaponWear);
    const effectiveArmorBonus = {};
    for (const loc of ARMOR_LOCATIONS) {
        effectiveArmorBonus[loc] = Math.max(0, armorBonus - armorWear[loc]);
    }

//////     console.log(`Weapon Wear: ${weaponWear}, Effective Weapon Bonus: ${effectiveWeaponBonus}`);
//////     console.log(`Armor Wear: ${armorWear}, Effective Armor Bonus: ${effectiveArmorBonus}`);
    
    // Special case: if armor type is "none" but any armor location has wear, reset it
    if (systemData.stats.armorType.value === "none") {
        let resetNeeded = false;
        for (const loc of ARMOR_LOCATIONS) {
            if (armorWear[loc] !== 0) { resetNeeded = true; break; }
        }
        if (resetNeeded) {
//////         console.log(`Armor type is "none" but battle wear present, resetting to 0`);
            for (const loc of ARMOR_LOCATIONS) {
                systemData.battleWear.armor[loc].value = 0;
            }
            this.update({"system.battleWear.armor": systemData.battleWear.armor});
        }
    }

    // Add weapon and armor bonuses (adjusted for battle wear)
    const damageValue = baseDamage + effectiveWeaponBonus;
    const soakValue = baseSoak + effectiveArmorBonus.torso;

    const locationSoak = {};
    for (const loc of ARMOR_LOCATIONS) {
        locationSoak[loc] = baseSoak + effectiveArmorBonus[loc];
    }

    if (!systemData.anatomy) systemData.anatomy = {};
    for (const loc of ARMOR_LOCATIONS) {
        if (!systemData.anatomy[loc]) systemData.anatomy[loc] = {};
        systemData.anatomy[loc].soak = locationSoak[loc];
        systemData.anatomy[loc].armor = effectiveArmorBonus[loc];
    }

//////     console.log(`Final damage value (base + effective weapon): ${damageValue}`);
//////     console.log(`Final soak value (base + effective armor): ${soakValue}`);

    // Store all calculated values in derived data
    systemData.derived.abilityBonus = abilityBonus;
    systemData.derived.damageValue = damageValue;
    systemData.derived.soakValue = soakValue;
    systemData.derived.locationSoak = locationSoak;
    systemData.derived.plusHits = plusHits;

    // Store weapon and armor bonuses for battle wear calculations
    systemData.derived.weaponBonus = weaponBonus;
    systemData.derived.armorBonus = armorBonus;
    systemData.derived.weaponBonusMax = weaponBonus;
    systemData.derived.armorBonusMax = armorBonus;
    systemData.derived.weaponBonusEffective = effectiveWeaponBonus;
    systemData.derived.armorBonusEffective = effectiveArmorBonus;

    // Initialize custom attributes if they don't exist or force update values
    if (!systemData.customAttributes) systemData.customAttributes = {};
    
    // Custom 1
    if (!systemData.customAttributes.custom1) {
      systemData.customAttributes.custom1 = { 
        label: "Custom 1", 
        value: systemData.derived.abilityScore || 0,
        hits: 0
      };
    }
    
    // Custom 2
    if (!systemData.customAttributes.custom2) {
      systemData.customAttributes.custom2 = { 
        label: "Custom 2", 
        value: systemData.derived.abilityScore || 0,
        hits: 0
      };
    }
    
    // Make sure custom attributes have the right structure
    if (!systemData.customAttributes.custom1.label) systemData.customAttributes.custom1.label = "Custom 1";
    if (!systemData.customAttributes.custom1.value) systemData.customAttributes.custom1.value = systemData.derived.abilityScore || 0;
    if (!systemData.customAttributes.custom1.hits) systemData.customAttributes.custom1.hits = 0;
    
    if (!systemData.customAttributes.custom2.label) systemData.customAttributes.custom2.label = "Custom 2";
    if (!systemData.customAttributes.custom2.value) systemData.customAttributes.custom2.value = systemData.derived.abilityScore || 0;
    if (!systemData.customAttributes.custom2.hits) systemData.customAttributes.custom2.hits = 0;

    // For mob-specific calculations
    if (systemData.mob?.isMob?.value) {
      const bodies = systemData.mob.bodies.value || 0;
      let mobScale = "none";
      let mobAttacks = 0;
      
      // Determine mob scale based on number of bodies
      if (bodies >= 100) {
        mobScale = "huge";
        mobAttacks = 5;
      } else if (bodies >= 50) {
        mobScale = "large";
        mobAttacks = 4;
      } else if (bodies >= 20) {
        mobScale = "medium";
        mobAttacks = 3;
      } else if (bodies >= 5) {
        mobScale = "small";
        mobAttacks = 2;
      }
      
      systemData.derived.mobScale = mobScale;
      systemData.derived.mobAttacks = mobAttacks;
    }
    
    // Initialize Conditions
    const condNames = [
      "aflame",
      "bleed",
      "poison",
      "corruption",
      "stress",
      "blind",
      "deaf",
      "pain",
      "fatigue",
      "entangle",
      "helpless",
      "stun",
      "prone"
    ];
    if (!systemData.conditions) systemData.conditions = {};
    for (const key of condNames) {
      if (!systemData.conditions[key] || typeof systemData.conditions[key]?.value !== 'number') {
        systemData.conditions[key] = { value: 0 };
      }
    }

    // Initialize trauma as an object of locations so multiple traumas can be tracked
    if (!systemData.conditions.trauma || typeof systemData.conditions.trauma !== 'object') {
      systemData.conditions.trauma = {};
    }
    const traumaLocations = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];
    for (const loc of traumaLocations) {
      if (!systemData.conditions.trauma[loc] || typeof systemData.conditions.trauma[loc].value !== 'number') {
        systemData.conditions.trauma[loc] = { value: 0 };
      }
    }
    
    // Final debug log of all derived values
     console.log("Monster derived values:", {
      abilityScore: systemData.derived.abilityScore,
      abilityBonus: systemData.derived.abilityBonus,
      damageValue: systemData.derived.damageValue,
      soakValue: systemData.derived.soakValue,
      plusHits: systemData.derived.plusHits,
      customAttributes: systemData.customAttributes
    });
  }

  /**
   * Roll an attribute test
   * @param {string} attributeName The name of the attribute to roll
   * @param {Object} options Options which modify the roll
   * @returns {Promise<Roll>} The Roll instance
   */
  async rollAttribute(attributeName, options={}) {
    const attribute = this.system.attributes[attributeName];
    if (!attribute) return;

    const luckSpent = options.luckSpent || false;

    const roll = new Roll("1d100");
    await roll.evaluate();

    // Get roll mode and extended visibility setting
    const rollMode = game.settings.get("core", "rollMode");
    const extendedVisibility = game.settings.get("witch-iron", "extendedRollVisibility");

    // Prepare chat data
    const targetValue = attribute.value + (this.system.modifiers?.global || 0);
    const rollTotal = roll.total;
    const isSuccess = rollTotal <= targetValue;
    const isDouble = rollTotal % 11 === 0 && rollTotal !== 100;
    const isCriticalSuccess = rollTotal <= 5 || (isSuccess && isDouble && !luckSpent);
    const isFumble = rollTotal >= 96 || (!isSuccess && isDouble && !luckSpent);
    
    // Calculate hits
    let hits = Math.floor(targetValue/10) - Math.floor(rollTotal/10);
    if (isCriticalSuccess) hits = Math.max(hits + 1, 6);
    if (isFumble) hits = Math.min(hits - 1, -6);

    // Format attribute name for display with capitalized first letter
    const formattedAttrName = attributeName.charAt(0).toUpperCase() + attributeName.slice(1);

    // Prepare the chat message data
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate("systems/witch-iron/templates/chat/roll-card.hbs", {
        actor: this,
        attributeName: attributeName,
        roll: roll,
        targetValue: targetValue,
        isSuccess: isSuccess,
        isCriticalSuccess: isCriticalSuccess,
        isFumble: isFumble,
        hits: hits,
        // New format: ActorName - Ability-Score
        label: `${formattedAttrName}`,
        luckSpent: luckSpent
      }),
      sound: CONFIG.sounds.dice
    };

    // Handle roll mode visibility
    if (extendedVisibility) {
      switch (rollMode) {
        case "blindroll":
          chatData.whisper = ChatMessage.getWhisperRecipients("GM");
          chatData.blind = true;
          break;
        case "selfroll":
          chatData.whisper = [game.user.id];
          break;
        case "gmroll":
          chatData.whisper = ChatMessage.getWhisperRecipients("GM").concat([game.user.id]);
          break;
      }
    } else {
      // Use Foundry's default roll mode handling
      ChatMessage.applyRollMode(chatData, rollMode);
    }

    // Create the chat message
    return ChatMessage.create(chatData);
  }

  /**
   * Roll a skill test
   * @param {string} skillName The name of the skill to roll
   * @param {Object} options Options which modify the roll
   * @returns {Promise<Roll>} The Roll instance
   */
  async rollSkill(skillName, options={}) {
//////     console.log(`Rolling skill: ${skillName} with options:`, options);
    
    const attributeMap = {
      combat: {
        athletics: "muscle",
        intimidate: "muscle",
        melee: "muscle"
      },
      physical: {
        hardship: "robustness",
        labor: "robustness",
        imbibe: "robustness",
        lightfoot: "agility",
        ride: "agility",
        skulk: "agility"
      },
      quickness: {
        cunning: "quickness",
        perception: "quickness",
        ranged: "quickness"
      },
      social: {
        leadership: "personality",
        carouse: "personality",
        coerce: "personality"
      },
      mental: {
        art: "finesse",
        operate: "finesse",
        trade: "finesse",
        heal: "intellect",
        research: "intellect",
        navigation: "intellect",
        steel: "willpower",
        survival: "willpower",
        husbandry: "willpower"
      }
    };
    
    // Find the category and attribute for this skill
    let foundCategory = null;
    let attributeName = null;
    
    // Look through the attribute map to find the skill
    for (const category in attributeMap) {
      if (attributeMap[category][skillName]) {
        foundCategory = category;
        attributeName = attributeMap[category][skillName];
        break;
      }
    }
    
    if (!foundCategory || !attributeName) {
      console.error(`Could not find category or attribute for skill: ${skillName}`);
      return;
    }
    
    // Get the skill info
    const skill = this.system.skills[foundCategory][skillName];
    const skillBonus = skill ? skill.value : 0;
    
    // Get the attribute value
    const attributeValue = this.system.attributes[attributeName]?.value || 0;
    
    // Calculate the target value (attribute + skill)
    let targetValue = attributeValue + skillBonus;
    // Override target value if custom provided (e.g., condition rating)
    if (options.customTargetValue !== undefined) {
      targetValue = Number(options.customTargetValue) || 0;
    }
    // Apply situational modifier
    const situationalMod = options.situationalMod || 0;
    targetValue = targetValue + situationalMod;
    
    // Get additional hits from options (for specializations)
    const additionalHits = options.additionalHits || 0;
    
    // Format the skill label based on specialization and rating
    let formattedLabel = skill.label;
    let specialization = null;
    
    // If there's a specialization with additional hits
    if (additionalHits > 0 && skill && skill.specializations) {
      // Find the specialization with this rating
      const spec = skill.specializations.find(s => s.rating === additionalHits);
      if (spec) {
        specialization = spec.name;
        // Format: Skill-Name (Specialization Name) +Rating
        formattedLabel = `${skill.label} (${spec.name}) +${additionalHits}`;
      } else {
        // If no matching specialization found but we have additional hits
        formattedLabel = `${skill.label} +${additionalHits}`;
      }
    } else if (skillBonus > 0) {
      // Format: Skill-Name +GlobalRating (if rating > 0)
      formattedLabel = `${skill.label} +${skillBonus}`;
    }
    // If skillBonus is 0, just use the skill label without +0
    
    // Set up roll data
    const rollData = {
      targetValue: targetValue,
      label: formattedLabel,
      situationalMod: situationalMod,
      additionalHits: additionalHits,
      specialization: specialization,
      luckSpent: options.luckSpent || false
    };

    // Perform the roll
    return this._performRoll(rollData);
  }

  /**
   * Roll a monster check with appropriate modifiers
   * @param {Object} options Options which modify the roll
   * @returns {Promise<Roll>} The Roll instance
   */
  async rollMonsterCheck(options={}) {
    // Check if actor is a monster, and fix if needed
    if (this.type !== 'monster') {
      console.warn(`Actor ${this.name} is not a monster, updating type...`);
      await this.update({ 'type': 'monster' });
      
      // Re-prepare data for the monster after update
      this.prepareData();
    }
    
    // Debug logs to see what's happening
//////     console.log("Monster Check Roll - Actor:", this.name);
//////     console.log("Monster derived data:", this.system.derived);
//////     console.log("Roll options:", options);
    
    // Make sure we have proper derived data
    if (!this.system.derived || typeof this.system.derived.abilityScore === 'undefined') {
      console.warn(`Actor ${this.name} missing derived data, calculating...`);
      // Force calculation if missing
      this._prepareMonsterData(this);
    }
    
    // Use customTargetValue if provided, otherwise get from derived ability score
    let abilityScore;
    if (options.customTargetValue !== undefined) {
      abilityScore = Number(options.customTargetValue) || 0;
//////       console.log("Using custom target value:", abilityScore);
    } else {
      abilityScore = Number(this.system.derived?.abilityScore) || 0;
//////       console.log("Using derived ability score:", abilityScore);
    }
    
    // Apply situational modifier if provided
    const situationalMod = Number(options.situationalMod) || 0;
//////     console.log("Situational Modifier:", situationalMod);
    
    // Calculate target value - explicitly make sure it's a number
    const targetValue = Number(abilityScore) + Number(situationalMod);
//////     console.log("Target Value:", targetValue);
    
    // Get the hits modifier - specialized checks have +Hits
    const additionalHits = Number(options.additionalHits) || 0;
//////     console.log("Additional Hits:", additionalHits);
    
    // Get the label for the roll
    const label = options.label || "Monster Check";
    
    // Check if this is a combat check
    const isCombatCheck = options.isCombatCheck === true;
//////     console.log(`Monster Check - Combat Check: ${isCombatCheck}`);
    
    // Make sure the data is a proper object with explicitly defined values
    const rollData = {
      targetValue: Number(targetValue),
      label: String(label),
      situationalMod: Number(situationalMod),
      additionalHits: Number(additionalHits),
      isCombatCheck: isCombatCheck,
      luckSpent: options.luckSpent || false
    };
    
//////     console.log("Roll Data:", rollData);
    
    // Perform the roll
    return this._performRoll(rollData);
  }

  /**
   * Perform a d100 roll with Witch Iron system logic
   * @param {Object} options Roll options
   * @returns {Promise<Roll>} The Roll instance
   * @private
   */
  async _performRoll({ targetValue, label, situationalMod = 0, additionalHits = 0, isCombatCheck = false, luckSpent = false }) {
    // Debug log for incoming parameters
//////     console.log("_performRoll - Incoming params:", { targetValue, label, situationalMod, additionalHits, isCombatCheck });
    
    // Enforce types
    targetValue = Number(targetValue || 0);
    situationalMod = Number(situationalMod || 0);
    additionalHits = Number(additionalHits || 0);
    
    // Create the dice roll
    const roll = new Roll("1d100");
    await roll.evaluate();
    
    // Calculate success/failure
    const rollTotal = roll.total;
    const isSuccess = rollTotal <= targetValue;
    const isDouble = rollTotal % 11 === 0 && rollTotal !== 100;
    const isCriticalSuccess = rollTotal <= 5 || (isSuccess && isDouble && !luckSpent);
    const isFumble = rollTotal >= 96 || (!isSuccess && isDouble && !luckSpent);
    
    // Calculate hits (no need to recalculate if additionalHits is provided for monsters)
    const baseHits = Math.floor(targetValue/10) - Math.floor(rollTotal/10);
    let hits = baseHits;
    if (isSuccess) hits += additionalHits;
    
    // Debug log for calculations
     console.log("Roll Results:", {
      roll: rollTotal,
      targetValue,
      isSuccess,
      isCriticalSuccess,
      isFumble,
      baseHits,
      additionalHits,
      finalHits: hits,
      isCombatCheck
    });
    
    // Apply critical effects
    if (isCriticalSuccess) hits = Math.max(hits + 1, 6);  // At least 6 hits on crit success
    if (isFumble) hits = Math.min(hits - 1, -6);  // At most -6 hits on fumble
    
    // Get roll mode and extended visibility setting
    const rollMode = game.settings.get("core", "rollMode");
    const extendedVisibility = game.settings.get("witch-iron", "extendedRollVisibility");
    
    // Prepare chat data and explicitly convert targetValue to a number
    const templateData = {
      actor: this,
      roll: roll,
      targetValue: targetValue,
      label: label,
      isSuccess: isSuccess,
      isCriticalSuccess: isCriticalSuccess,
      isFumble: isFumble,
      hits: hits,
      situationalMod: situationalMod,
      additionalHits: additionalHits,
      isCombatCheck: isCombatCheck,
      luckSpent: luckSpent,
      actorId: this.id,
      actorName: this.name
    };
    
//////     console.log("Template data:", templateData);
    
    // Additional JSON stringification to force value conversion
    try {
      // This forces a proper serialization/conversion of numbers
      const jsonData = JSON.stringify(templateData);
//////       console.log("Stringified template data:", jsonData);
    } catch (err) {
      console.error("Error stringifying template data:", err);
    }
    
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: await renderTemplate("systems/witch-iron/templates/chat/roll-card.hbs", templateData),
      sound: CONFIG.sounds.dice
    };
    
    // Handle roll mode visibility
    if (extendedVisibility) {
      switch (rollMode) {
        case "blindroll":
          chatData.whisper = ChatMessage.getWhisperRecipients("GM");
          chatData.blind = true;
          break;
        case "selfroll":
          chatData.whisper = [game.user.id];
          break;
        case "gmroll":
          chatData.whisper = ChatMessage.getWhisperRecipients("GM").concat([game.user.id]);
          break;
      }
    } else {
      // Use Foundry's default roll mode handling
      ChatMessage.applyRollMode(chatData, rollMode);
    }
    
    // Create the chat message
    return ChatMessage.create(chatData);
  }
} 
