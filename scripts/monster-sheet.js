/**
 * Monster sheet class for the Witch Iron system
 * @extends {ActorSheet}
 */
export class WitchIronMonsterSheet extends ActorSheet {
  /** 
   * Helper method to capitalize the first letter of a string
   * @param {string} string - The string to capitalize
   * @returns {string} The capitalized string
   */
  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "monster"],
      template: "systems/witch-iron/templates/actors/monster-sheet.hbs",
      width: 720,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      // Add CSS styles for battle wear controls
      styles: [
        "systems/witch-iron/styles/witch-iron.css"
      ]
    });
  }

  constructor(actor, options) {
    super(actor, options);
    
    // Add a special debug toggle function to the global window object
    // This allows debugging from the console with: game.witchIronDebug.toggleDebugInfo()
    if (!window.game.witchIronDebug) {
      window.game.witchIronDebug = {
        toggleDebugInfo: () => {
          const debugElements = document.querySelectorAll('.debug-info');
          debugElements.forEach(el => {
            if (el.style.display === 'none') {
              el.style.display = 'block';
              console.log('Witch Iron | Debug info shown');
            } else {
              el.style.display = 'none';
              console.log('Witch Iron | Debug info hidden');
            }
          });
          return `Toggled ${debugElements.length} debug elements`;
        }
      };
      console.log('Witch Iron | Debug utilities registered! Use game.witchIronDebug.toggleDebugInfo() to show debug info');
    }
  }

  /** @override */
  async _render(force = false, options = {}) {
    const result = await super._render(force, options);
    
    // If the actor type isn't set to monster, fix it
    if (this.actor.type !== 'monster') {
      console.log(`Fixing actor type for ${this.actor.name}: "${this.actor.type}" => "monster"`);
      await this.actor.update({ 'type': 'monster' });
    }
    
    const html = this.element;
    
    if (html && html.length) {
      const system = this.actor.system;
      
      // Force actor to recalculate derived data
      if (!system.derived) {
        console.log(`_render: No derived data for actor ${this.actor.name}`);
        await this.actor.update({});
      }
      
      console.log('Actor data:', this.actor);
      console.log('Actor custom:', this.actor.system.custom);
      console.log('Actor derived:', this.actor.system.derived);
      console.log('Actor battle wear:', this.actor.system.battleWear);
      
      // Helper function to safely set select values
      const safeSetSelectValue = (selector, value) => {
        const select = html.find(selector);
        if (select.length && value !== undefined) {
          select.val(value);
        }
      };
      
      // Set dropdown values
      safeSetSelectValue('select[name="system.stats.hitDice.value"]', system.stats.hitDice.value);
      safeSetSelectValue('select[name="system.stats.size.value"]', system.stats.size.value);
      safeSetSelectValue('select[name="system.stats.weaponType.value"]', system.stats.weaponType.value);
      safeSetSelectValue('select[name="system.stats.armorType.value"]', system.stats.armorType.value);
      
      // Update battle wear values
      const weaponWear = system.battleWear?.weapon?.value || 0;
      const armorWear = system.battleWear?.armor?.value || 0;
      
      console.log(`Monster Sheet: Setting battle wear - Weapon: ${weaponWear}, Armor: ${armorWear}`);
      
      // Set the battle wear value displays
      html.find('.battle-wear-value').each((i, el) => {
        const valueElement = $(el);
        const parent = valueElement.closest('.battle-wear-control');
        const type = parent.find('button').data('type');
        
        console.log(`Found battle wear element #${i}, type: ${type}, current text: '${valueElement.text()}'`);
        
        if (type === 'weapon') {
          valueElement.text(weaponWear);
          console.log(`Set weapon wear to: ${weaponWear}`);
        } else if (type === 'armor') {
          valueElement.text(armorWear);
          console.log(`Set armor wear to: ${armorWear}`);
        }
      });
      
      // Update attribute circles and derived stats
      this._setupAttributeCircles(html);
      this._updateDerivedDisplay(html);
      
      // Make sure battle wear displays are up-to-date
      this._updateBattleWearDisplays();
    }
    
    return result;
  }

  /** @override */
  getData() {
    // Get the base data from the parent class
    const data = super.getData();
    const actorData = data.actor;
    
    // Ensure hit dice value is a number
    if (actorData.system?.stats?.hitDice) {
      actorData.system.stats.hitDice.value = Number(actorData.system.stats.hitDice.value) || 1;
      console.log("getData - Current HD value:", actorData.system.stats.hitDice.value);
    }
    
    // Initialize battleWear if needed
    if (!actorData.system.battleWear) {
      actorData.system.battleWear = {
        weapon: { value: 0 },
        armor: { value: 0 }
      };
    }

    // Calculate weapon and armor max bonuses based on type
    const weaponBonusTable = {
      "unarmed": 2,
      "light": 4,
      "medium": 6,
      "heavy": 8,
      "superheavy": 10
    };

    const armorBonusTable = {
      "none": 0,
      "light": 2,
      "medium": 4,
      "heavy": 6,
      "superheavy": 8
    };

    // Get the current weapon and armor types
    const weaponType = actorData.system.stats.weaponType?.value || "unarmed";
    const armorType = actorData.system.stats.armorType?.value || "none";

    // Calculate max bonuses
    actorData.system.derived.weaponBonusMax = weaponBonusTable[weaponType] || 0;
    actorData.system.derived.armorBonusMax = armorBonusTable[armorType] || 0;

    // Calculate effective bonuses after battle wear
    actorData.system.derived.weaponBonusEffective = Math.max(0, actorData.system.derived.weaponBonusMax - (actorData.system.battleWear?.weapon?.value || 0));
    actorData.system.derived.armorBonusEffective = Math.max(0, actorData.system.derived.armorBonusMax - (actorData.system.battleWear?.armor?.value || 0));
    
    // Ensure system.flags exists and initialize combat check if needed
    if (!actorData.system.flags) {
      console.log(`Monster Sheet: Initializing system.flags for actor ${actorData.name}`);
      actorData.system.flags = {};
    }
    
    // Initialize combat check flag if it doesn't exist
    if (actorData.system.flags.isCombatCheck === undefined) {
      console.log(`Monster Sheet: Initializing combat check flag for actor ${actorData.name}`);
      actorData.system.flags.isCombatCheck = false;
    }
    
    console.log(`Monster Sheet: Combat check flag status: ${actorData.system.flags.isCombatCheck}`);
    
    // Add dropdown options for monster properties
    data.sizes = {
      "tiny": "Tiny (-5)",
      "small": "Small (-2)", 
      "medium": "Medium (+0)", 
      "large": "Large (+5)", 
      "huge": "Huge (+10)", 
      "gigantic": "Gigantic (+20)"
    };
    
    data.weaponTypes = {
      "unarmed": "Unarmed (+2)",
      "light": "Light (+4)",
      "medium": "Medium (+6)",
      "heavy": "Heavy (+8)",
      "superheavy": "Super Heavy (+10)"
    };
    
    data.armorTypes = {
      "none": "None (+0)",
      "light": "Light (+2)",
      "medium": "Medium (+4)",
      "heavy": "Heavy (+6)",
      "superheavy": "Super Heavy (+8)"
    };
    
    // Add hit dice options
    data.hitDiceOptions = {};
    for (let i = 1; i <= 20; i++) {
      data.hitDiceOptions[i] = i;
    }
    
    // Add items categorized by type
    data.injuries = actorData.items.filter(item => item.type === 'injury');
    
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Special Quality
    html.find('.add-quality').click(this._onAddQuality.bind(this));

    // Delete Special Quality
    html.find('.delete-quality').click(this._onDeleteQuality.bind(this));

    // Attribute circle clicks
    html.find('.attribute-circle').click(this._onAttributeCircleClick.bind(this));
    
    // Custom attribute configuration
    html.find('.config-button').click(this._onConfigCustomAttribute.bind(this));
    
    // Monster action buttons
    html.find('.monster-action.melee-attack').click(this._onMeleeAttack.bind(this));
    html.find('.monster-action.specialized-roll').click(this._rollSpecializedCheck.bind(this));
    
    // Battle wear buttons
    html.find('.battle-wear-plus').click(this._onBattleWearPlus.bind(this));
    html.find('.battle-wear-minus').click(this._onBattleWearMinus.bind(this));
    html.find('.battle-wear-reset').click(this._onBattleWearReset.bind(this));
    
    // Set up attribute circles to show proper visual styling
    this._setupAttributeCircles(html);
    
    // Update derived stats display with current values
    this._updateDerivedDisplay(html);
    
    // Add listener for Hit Dice changes - only use the change event
    const hitDiceSelect = html.find('select[name="system.stats.hitDice.value"]');
    
    // Log the current value for debugging
    console.log("Hit Dice Select Initial Value:", hitDiceSelect.val());
    console.log("Actor's Hit Dice Value:", this.actor.system.stats.hitDice.value);
    
    // Only use the change event (not mouseup which causes too many updates)
    hitDiceSelect.change(this._onHitDiceChange.bind(this));
    
    // Add listeners for other dropdowns
    html.find('select[name="system.stats.size.value"]').change(this._onSizeChange.bind(this));
    html.find('select[name="system.stats.weaponType.value"]').change(this._onWeaponTypeChange.bind(this));
    html.find('select[name="system.stats.armorType.value"]').change(this._onArmorTypeChange.bind(this));
    
    // Item management listeners
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
  }
  
  /**
   * Handle custom attribute configuration
   * @param {Event} event The originating click event
   * @private
   */
  async _onConfigCustomAttribute(event) {
    event.preventDefault();
    event.stopPropagation(); // Prevent triggering the circle click
    
    const element = event.currentTarget;
    const circle = element.closest('.attribute-circle');
    const attributeKey = circle.dataset.attribute;
    
    // Get current attribute data
    const attributeData = this.actor.system.customAttributes?.[attributeKey] || {
      label: "Custom",
      value: 0,
      hits: 0
    };
    
    // Create dialog content
    const content = `
      <form>
        <div class="form-group">
          <label>Attribute Name:</label>
          <input type="text" name="label" value="${attributeData.label}" data-dtype="String">
        </div>
        <div class="form-group">
          <label>Value:</label>
          <input type="number" name="value" value="${attributeData.value}" data-dtype="Number">
        </div>
        <div class="form-group">
          <label>+Hits:</label>
          <input type="number" name="hits" value="${attributeData.hits}" data-dtype="Number">
        </div>
      </form>
    `;
    
    // Show dialog
    new Dialog({
      title: "Configure Custom Attribute",
      content: content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
          callback: html => {
            const form = html.find('form')[0];
            const label = form.label.value;
            const value = parseInt(form.value.value) || 0;
            const hits = parseInt(form.hits.value) || 0;
            
            // Save the updated data
            const updateData = {};
            updateData[`system.customAttributes.${attributeKey}.label`] = label;
            updateData[`system.customAttributes.${attributeKey}.value`] = value;
            updateData[`system.customAttributes.${attributeKey}.hits`] = hits;
            
            this.actor.update(updateData);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "save"
    }).render(true);
  }

  /**
   * Handle attribute circle clicks
   * @param {Event} event The originating click event
   * @private
   */
  _onAttributeCircleClick(event) {
    event.preventDefault();
    
    // If the click was on a config button, don't do anything
    if (event.target.closest('.config-button')) return;
    
    const element = event.currentTarget;
    const attribute = element.dataset.attribute;
    
    // Roll the appropriate check based on which circle was clicked
    switch(attribute) {
      case "specialized":
        this._rollSpecializedCheck();
        break;
      case "general":
        this._rollGeneralCheck();
        break;
      case "inept":
        this._rollIneptCheck();
        break;
      case "custom1":
      case "custom2":
        this._rollCustomCheck(attribute);
        break;
    }
  }
  
  /**
   * Roll a custom attribute check
   * @param {string} attributeKey The key of the custom attribute
   * @private 
   */
  _rollCustomCheck(attributeKey) {
    const attributeData = this.actor.system.customAttributes?.[attributeKey];
    if (!attributeData) return;
    
    // Call the actor's rollMonsterCheck method with the custom attribute settings
    if (this.actor.rollMonsterCheck) {
      this.actor.rollMonsterCheck({
        label: `${attributeData.label} Check`,
        additionalHits: attributeData.hits || 0,
        customTargetValue: attributeData.value // Use the custom value as target
      });
    }
  }
  
  /**
   * Set up attribute circles with proper value display and styling
   * @param {jQuery} html The rendered sheet HTML
   * @private
   */
  _setupAttributeCircles(html) {
    // Log the actor's system data to check derived values
    console.log("Setting up Monster attribute circles for:", this.actor.name);
    console.log("Actor system data:", this.actor.system);
    console.log("Derived ability score:", this.actor.system.derived?.abilityScore);
    
    // For each attribute circle, update the styling based on the value
    html.find('.attribute-circle').each((i, el) => {
      const circle = $(el);
      const attributeType = circle.data('attribute');
      const valueDisplay = circle.find('.attribute-value');
      const labelDisplay = circle.find('.attribute-label');
      const bonusDisplay = circle.find('.attribute-bonus');
      let displayValue;
      
      if (attributeType === "custom1" || attributeType === "custom2") {
        // Get value from custom attributes
        const customAttr = this.actor.system.customAttributes?.[attributeType];
        displayValue = customAttr?.value || 0;
        
        // Update the label if it exists
        if (customAttr?.label && labelDisplay.length) {
          labelDisplay.text(customAttr.label);
        }
        
        // Update the +Hits display
        if (bonusDisplay.length) {
          bonusDisplay.text(`+Hits ${customAttr?.hits || 0}`);
        }
      } else {
        // Get value from regular attributes
        const abilityScore = this.actor.system.derived?.abilityScore || 0;
        const plusHits = this.actor.system.derived?.plusHits || 0;
        
        // For inept circle, apply the penalty to the displayed value
        displayValue = abilityScore;
        if (attributeType === "inept") {
          const hdValue = this.actor.system.stats?.hitDice?.value || 1;
          // Penalty table based on HD
          const ineptPenalties = {
            1: -10, 2: -13, 3: -10, 4: -14, 5: -10,
            6: -15, 7: -10, 8: -16, 9: -10, 10: -17,
            11: -10, 12: -18, 13: -10, 14: -19, 15: -20,
            16: -25, 17: -20, 18: -25, 19: -30, 20: -35
          };
          const penalty = ineptPenalties[hdValue] || -10;
          displayValue = Math.max(0, abilityScore + penalty); // Ensure it doesn't go below 0
        }
        
        // Update +Hits for specialized
        if (attributeType === "specialized" && bonusDisplay.length) {
          bonusDisplay.text(`+Hits ${plusHits}`);
        }
      }
      
      // Format to always show 2 digits
      if (displayValue < 10) {
        valueDisplay.text(`0${displayValue}`);
      } else {
        valueDisplay.text(displayValue);
      }
      
      // Don't need to adjust font size - the styles handle this now
    });
  }
  
  /**
   * Roll a specialized check for the monster
   * @private
   */
  _rollSpecializedCheck() {
    // Call the actor's rollMonsterCheck method with appropriate options
    if (this.actor.rollMonsterCheck) {
      this.actor.rollMonsterCheck({
        label: "Specialized Check",
        // Include the monster's +Hits bonus for specialized skills
        additionalHits: this.actor.system.derived?.plusHits || 0
      });
    }
  }
  
  /**
   * Roll a general check for the monster
   * @private
   */
  _rollGeneralCheck() {
    // Call the actor's rollMonsterCheck method with no additional modifiers
    if (this.actor.rollMonsterCheck) {
      this.actor.rollMonsterCheck({
        label: "General Check",
        additionalHits: 0
      });
    }
  }
  
  /**
   * Roll an inept check for the monster
   * @private
   */
  _rollIneptCheck() {
    // Get the penalty based on HD
    const hdValue = this.actor.system.stats?.hitDice?.value || 1;
    
    // Penalty table based on HD
    const ineptPenalties = {
      1: -10, 2: -13, 3: -10, 4: -14, 5: -10,
      6: -15, 7: -10, 8: -16, 9: -10, 10: -17,
      11: -10, 12: -18, 13: -10, 14: -19, 15: -20,
      16: -25, 17: -20, 18: -25, 19: -30, 20: -35
    };
    
    const penalty = ineptPenalties[hdValue] || -10;
    
    // Call the actor's rollMonsterCheck method with the penalty as situational modifier
    if (this.actor.rollMonsterCheck) {
      this.actor.rollMonsterCheck({
        label: "Inept Check",
        situationalMod: penalty,
        additionalHits: 0
      });
    }
  }

  /**
   * Handle adding a new special quality
   * @param {Event} event   The originating click event
   * @private
   */
  async _onAddQuality(event) {
    event.preventDefault();
    
    // Get current special qualities
    const qualities = this.actor.system.traits.specialQualities || [];
    
    // Add a new empty quality
    qualities.push("");
    
    // Update the actor
    await this.actor.update({ 'system.traits.specialQualities': qualities });
  }

  /**
   * Handle deleting a special quality
   * @param {Event} event   The originating click event
   * @private
   */
  async _onDeleteQuality(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const li = element.closest(".quality");
    const index = Number(li.dataset.index);
    
    // Get current special qualities
    const qualities = duplicate(this.actor.system.traits.specialQualities || []);
    
    // Remove the quality at the specified index
    qualities.splice(index, 1);
    
    // Update the actor
    await this.actor.update({ 'system.traits.specialQualities': qualities });
  }

  /**
   * Handle changes to Hit Dice
   * @param {Event} event The change event
   * @private
   */
  async _onHitDiceChange(event) {
    // Don't preventDefault() here - it prevents normal dropdown behavior
    const select = event.currentTarget;
    const newHD = parseInt(select.value) || 1;
    
    console.log(`Hit Dice changed to ${newHD}`);
    
    try {
      // Update the actor with the new HD value
      await this.actor.update({ 'system.stats.hitDice.value': newHD });
      console.log("Updated actor with new HD:", newHD);
      
      // Verify the update was successful
      console.log("Current HD value after update:", this.actor.system.stats.hitDice.value);
      
      // Get the current HTML and force a refresh of all derived displays
      const html = $(this.element);
      
      // Update attribute circles and derived stats
      this._setupAttributeCircles(html);
      this._updateDerivedDisplay(html);
      
    } catch (error) {
      console.error("Error updating hit dice:", error);
    }
  }

  /**
   * Update the derived stats display to reflect current values
   * @param {jQuery} html The rendered sheet HTML
   * @private
   */
  _updateDerivedDisplay(html) {
    // Force actor to recalculate derived values
    this.actor.prepareData();
    
    // Log the current derived values
    console.log("Updating derived display for:", this.actor.name);
    console.log("Current derived stats:", this.actor.system.derived);
    
    // Update each derived stat field
    if (html) {
      html.find('.derived-stat').each((i, el) => {
        const container = $(el);
        const label = container.find('label').text().trim().toLowerCase().replace(':', '');
        const valueSpan = container.find('span');
        let value = null;
        
        // Map the label to the appropriate derived value
        if (label.includes('ability score')) value = this.actor.system.derived.abilityScore;
        else if (label.includes('ability bonus')) value = this.actor.system.derived.abilityBonus;
        else if (label.includes('damage value')) value = this.actor.system.derived.damageValue;
        else if (label.includes('soak value')) value = this.actor.system.derived.soakValue;
        else if (label.includes('hits')) value = this.actor.system.derived.plusHits;
        
        // Update the value if we found a match
        if (value !== null && valueSpan.length) {
          console.log(`Updating ${label} to ${value}`);
          valueSpan.text(value);
        }
      });
    }
  }

  /**
   * Handle changes to size
   * @param {Event} event The change event
   * @private
   */
  async _onSizeChange(event) {
    const select = event.currentTarget;
    const newSize = select.value;
    
    console.log(`Size changed to ${newSize}`);
    
    try {
      // Update the actor with the new size value
      await this.actor.update({ 'system.stats.size.value': newSize });
      console.log("Updated actor with new size:", newSize);
      
      // Force update for all derived stats
      const html = $(this.element);
      this._updateDerivedDisplay(html);
    } catch (error) {
      console.error("Error updating size:", error);
    }
  }

  /**
   * Handle changes to weapon type
   * @param {Event} event The change event
   * @private
   */
  async _onWeaponTypeChange(event) {
    const select = event.currentTarget;
    const newWeaponType = select.value;
    
    console.log(`Weapon type changed to ${newWeaponType}`);
    
    try {
      // Update the actor with the new weapon type value
      await this.actor.update({ 'system.stats.weaponType.value': newWeaponType });
      console.log("Updated actor with new weapon type:", newWeaponType);
      
      // Force update for all derived stats
      const html = $(this.element);
      this._updateDerivedDisplay(html);
    } catch (error) {
      console.error("Error updating weapon type:", error);
    }
  }

  /**
   * Handle changes to armor type
   * @param {Event} event The change event
   * @private
   */
  async _onArmorTypeChange(event) {
    const select = event.currentTarget;
    const newArmorType = select.value;
    
    console.log(`Armor type changed to ${newArmorType}`);
    
    try {
      // Update the actor with the new armor type value
      await this.actor.update({ 'system.stats.armorType.value': newArmorType });
      console.log("Updated actor with new armor type:", newArmorType);
      
      // Force update for all derived stats
      const html = $(this.element);
      this._updateDerivedDisplay(html);
    } catch (error) {
      console.error("Error updating armor type:", error);
    }
  }

  /**
   * Handle melee attack button click
   * @param {Event} event The originating click event
   * @private
   */
  _onMeleeAttack(event) {
    event.preventDefault();
    
    console.log(`Witch Iron | Performing melee attack for monster ${this.actor.name}`);
    
    // Ensure the actor's combat check flag is set to true before rolling
    // This is crucial because the quarrel system checks this flag on the actor itself
    if (this.actor.system.flags && (this.actor.system.flags.isCombatCheck === undefined || this.actor.system.flags.isCombatCheck === false)) {
      console.log(`Witch Iron | Setting isCombatCheck flag to true for ${this.actor.name}`);
      this.actor.update({'system.flags.isCombatCheck': true});
    }
    
    // Call the actor's rollMonsterCheck method with combat check flag
    if (this.actor.rollMonsterCheck) {
      // Set up options for a combat roll with specialized bonus
      const combatOptions = {
        label: "Melee Attack",
        isCombatCheck: true,
        additionalHits: this.actor.system.derived?.plusHits || 0
      };
      
      console.log(`Witch Iron | Combat options for melee attack:`, combatOptions);
      
      // Perform the roll with combat flag
      this.actor.rollMonsterCheck(combatOptions);
    } else {
      console.error(`Witch Iron | ERROR: Actor ${this.actor.name} does not have rollMonsterCheck method`);
    }
  }

  /**
   * Handle creating a new Owned Item for the actor
   * @param {Event} event The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    
    // Prepare the item data
    const itemData = {
      name: `New ${this.capitalize(type)}`,
      type: type,
      system: {}
    };
    
    // Special handling for injury type
    if (type === "injury") {
      itemData.name = "New Injury";
      itemData.img = "icons/svg/blood.svg";
      itemData.system = {
        description: "",
        effect: "",
        location: "",
        severity: {
          value: 1
        }
      };
    }
    
    // Create the item
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }
  
  /**
   * Handle editing an existing Owned Item for the actor
   * @param {Event} event The originating click event
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    
    // Open the item sheet
    item.sheet.render(true);
  }
  
  /**
   * Handle deleting an existing Owned Item for the actor
   * @param {Event} event The originating click event
   * @private
   */
  _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    
    // Confirm the deletion
    new Dialog({
      title: "Confirm Deletion",
      content: "<p>Are you sure you want to delete this item?</p>",
      buttons: {
        yes: {
          icon: '<i class="fas fa-trash"></i>',
          label: "Delete",
          callback: () => this.actor.deleteEmbeddedDocuments("Item", [li.dataset.itemId])
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "no"
    }).render(true);
  }

  /**
   * Handle increasing battle wear
   * @param {Event} event The click event
   * @private
   */
  async _onBattleWearPlus(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type; // weapon or armor
    
    // Get current battle wear value
    const currentWear = this.actor.system.battleWear?.[type]?.value || 0;
    
    // Get max wear
    const maxWear = this.actor.system.derived?.[`${type}BonusMax`] || 0;
    
    // Don't exceed maximum
    if (currentWear >= maxWear) {
      console.log(`${type} wear is already at maximum (${maxWear})`);
      return;
    }
    
    // Calculate new wear value
    const newWear = Math.min(maxWear, currentWear + 1);
    console.log(`Increasing ${type} wear from ${currentWear} to ${newWear}`);
    
    // Prepare update data
    const updateData = {};
    updateData[`system.battleWear.${type}.value`] = newWear;
    
    // Update the actor
    await this.actor.update(updateData);
    
    // Force refresh
    this._updateBattleWearDisplays();
  }
  
  /**
   * Handle decreasing battle wear
   * @param {Event} event The click event
   * @private
   */
  async _onBattleWearMinus(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type; // weapon or armor
    
    // Get current battle wear value
    const currentWear = this.actor.system.battleWear?.[type]?.value || 0;
    
    // Don't go below zero
    if (currentWear <= 0) {
      console.log(`${type} wear is already at minimum (0)`);
      return;
    }
    
    // Calculate new wear value
    const newWear = Math.max(0, currentWear - 1);
    console.log(`Decreasing ${type} wear from ${currentWear} to ${newWear}`);
    
    // Prepare update data
    const updateData = {};
    updateData[`system.battleWear.${type}.value`] = newWear;
    
    // Update the actor
    await this.actor.update(updateData);
    
    // Force refresh
    this._updateBattleWearDisplays();
  }
  
  /**
   * Handle resetting battle wear
   * @param {Event} event The click event
   * @private
   */
  async _onBattleWearReset(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type; // weapon or armor
    
    // Get current battle wear value
    const currentWear = this.actor.system.battleWear?.[type]?.value || 0;
    
    // Only do something if wear > 0
    if (currentWear <= 0) {
      console.log(`${type} wear is already at 0`);
      return;
    }
    
    // Prepare update data
    const updateData = {};
    updateData[`system.battleWear.${type}.value`] = 0;
    
    // Update the actor
    await this.actor.update(updateData);
    console.log(`Reset ${type} wear from ${currentWear} to 0`);
    
    // Force refresh
    this._updateBattleWearDisplays();
  }

  /**
   * Update the battle wear displays with current values
   * @private
   */
  _updateBattleWearDisplays() {
    console.log("Updating battle wear displays - Weapon: " + (this.actor.system.battleWear?.weapon?.value || 0) + 
                ", Armor: " + (this.actor.system.battleWear?.armor?.value || 0));
    console.log("Actor's full battleWear data:", this.actor.system.battleWear);
    
    // Force actor to recalculate derived data
    this.actor.prepareData();
    
    const battleWearElements = this.element.find('.battle-wear-value');
    console.log(`Found ${battleWearElements.length} battle wear value elements`);
    
    if (battleWearElements.length === 0) {
        console.warn("No battle wear elements found in the sheet");
        return;
    }
    
    // Get fresh battle wear values from the actor
    // Force default to 0 for both weapon and armor wear
    let weaponWear = this.actor.system.battleWear?.weapon?.value;
    let armorWear = this.actor.system.battleWear?.armor?.value;
    
    // Ensure values are numbers and default to 0
    weaponWear = Number(weaponWear) || 0;
    armorWear = Number(armorWear) || 0;
    
    // Get the current weapon and armor types
    const weaponType = this.actor.system.stats.weaponType?.value || "unarmed";
    const armorType = this.actor.system.stats.armorType?.value || "none";
    
    // If armor type is "none", force armor wear to 0
    if (armorType === "none" && armorWear !== 0) {
        console.log(`Armor type is "none", forcing armor wear from ${armorWear} to 0`);
        armorWear = 0;
        this.actor.update({"system.battleWear.armor.value": 0});
    }
    
    // If values are unexpectedly high for a new monster, reset them to 0
    if (weaponWear > 0 && !this.actor.system.derived?.weaponBonusMax) {
        console.log(`Resetting unexpected weapon wear value of ${weaponWear} to 0`);
        weaponWear = 0;
        this.actor.update({"system.battleWear.weapon.value": 0});
    }
    
    if (armorWear > 0 && !this.actor.system.derived?.armorBonusMax) {
        console.log(`Resetting unexpected armor wear value of ${armorWear} to 0`);
        armorWear = 0;
        this.actor.update({"system.battleWear.armor.value": 0});
    }
    
    console.log(`Using weapon wear: ${weaponWear}, armor wear: ${armorWear}`);
    
    // Process each battle wear element
    battleWearElements.each((i, el) => {
        const element = $(el);
        const type = element.data('type');
        const currentText = element.text();
        console.log(`Processing element #${i}, type: ${type}, current text: '${currentText}'`);
        
        if (type === 'weapon') {
            // Update weapon wear display
            const newText = `${weaponWear}`;
            console.log(`Set weapon wear display to: ${newText} (was: ${currentText})`);
            element.text(newText);
        } else if (type === 'armor') {
            // Update armor wear display
            const newText = `${armorWear}`;
            console.log(`Set armor wear display to: ${newText} (was: ${currentText})`);
            element.text(newText);
        }
    });
    
    // Update button states based on current values
    this._updateBattleWearButtonStates();
    
    console.log("Battle wear displays updated successfully");
  }

  // Add a new method to update battle wear button states
  _updateBattleWearButtonStates() {
    // Get max values
    const weaponMax = this.actor.system.derived?.weaponBonusMax || 0;
    const armorMax = this.actor.system.derived?.armorBonusMax || 0;
    
    // Get current values
    const weaponWear = this.actor.system.battleWear?.weapon?.value || 0;
    const armorWear = this.actor.system.battleWear?.armor?.value || 0;
    
    // Get the current armor type
    const armorType = this.actor.system.stats.armorType?.value || "none";
    
    // Update weapon button states
    const weaponPlusBtn = this.element.find('.battle-wear-btn.plus[data-type="weapon"]');
    const weaponMinusBtn = this.element.find('.battle-wear-btn.minus[data-type="weapon"]');
    
    if (weaponPlusBtn.length) {
        weaponPlusBtn.prop('disabled', weaponWear >= weaponMax);
    }
    if (weaponMinusBtn.length) {
        weaponMinusBtn.prop('disabled', weaponWear <= 0);
    }
    
    // Update armor button states
    const armorPlusBtn = this.element.find('.battle-wear-btn.plus[data-type="armor"]');
    const armorMinusBtn = this.element.find('.battle-wear-btn.minus[data-type="armor"]');
    
    if (armorPlusBtn.length) {
        // Disable the plus button if armor is at max OR if armor type is "none"
        armorPlusBtn.prop('disabled', armorWear >= armorMax || armorType === "none");
    }
    if (armorMinusBtn.length) {
        armorMinusBtn.prop('disabled', armorWear <= 0);
    }
    
    console.log("Battle wear button states updated");
  }
}

/**
 * Add a hook to update battle wear displays when actor data changes
 */
Hooks.on("updateActor", (actor, changes, options, userId) => {
    // Only process if this is our client's update
    if (game.user.id !== userId) return;
    
    // Check if battle wear values have changed
    const hasBattleWearChanges = changes.system?.battleWear || 
                               (changes.system?.derived?.weaponBonusEffective !== undefined) ||
                               (changes.system?.derived?.armorBonusEffective !== undefined);
    
    // Log the update for debugging
    console.log(`Actor ${actor.name} updated. Changes:`, changes);
    console.log(`Has battle wear changes: ${hasBattleWearChanges}`);
    
    if (hasBattleWearChanges) {
        console.log(`Detected battle wear changes for ${actor.name}, refreshing sheet display`);
        
        // Force the actor to recalculate derived data
        actor.prepareData();
        
        // See if the actor has an open sheet
        const sheet = actor.sheet;
        if (sheet?.rendered) {
            // If it's a WitchIronMonsterSheet, update battle wear displays
            if (sheet._updateBattleWearDisplays && typeof sheet._updateBattleWearDisplays === 'function') {
                console.log(`Updating battle wear displays for ${actor.name}`);
                
                // Add debug information
                const weaponWear = actor.system.battleWear?.weapon?.value || 0;
                const armorWear = actor.system.battleWear?.armor?.value || 0;
                console.log(`Current battle wear values - Weapon: ${weaponWear}, Armor: ${armorWear}`);
                
                // Update the displays
                sheet._updateBattleWearDisplays();
                
                // Extra step: Directly set the values in HTML elements
                const html = sheet.element;
                if (html) {
                    const weaponWearElement = html.find('.battle-wear-value[data-type="weapon"]');
                    const armorWearElement = html.find('.battle-wear-value[data-type="armor"]');
                    
                    if (weaponWearElement.length) {
                        console.log(`Setting weapon wear element text to: ${weaponWear}`);
                        weaponWearElement.text(weaponWear);
                    }
                    
                    if (armorWearElement.length) {
                        console.log(`Setting armor wear element text to: ${armorWear}`);
                        armorWearElement.text(armorWear);
                    }
                }
            } else {
                // Otherwise do a full render
                console.log(`Full render for ${actor.name} sheet`);
                sheet.render(true);
            }
        } else {
            console.log(`No open sheet found for ${actor.name}`);
        }
    }
}); 