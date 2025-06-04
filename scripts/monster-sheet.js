// Suppress console.log override for debugging; remove this line to restore logging
// console.log = () => {};

// Import the quarrel API for non-combat condition checks
import { manualQuarrel } from "./quarrel.js";
import { createItem } from "./utils.js";
import { openModifierDialog } from "./modifier-dialog.js";

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
      // Prevent automatic sheet re-render on actor updates to avoid input blinking
      reRenderOnUpdate: false,
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
//////               console.log('Witch Iron | Debug info shown');
            } else {
              el.style.display = 'none';
//////               console.log('Witch Iron | Debug info hidden');
            }
          });
          return `Toggled ${debugElements.length} debug elements`;
        }
      };
//////       console.log('Witch Iron | Debug utilities registered! Use game.witchIronDebug.toggleDebugInfo() to show debug info');
    }
  }

  /** @override */
  async _render(force = false, options = {}) {
    const result = await super._render(force, options);
    
    // If the actor type isn't set to monster, fix it
    if (this.actor.type !== 'monster') {
//////       console.log(`Fixing actor type for ${this.actor.name}: "${this.actor.type}" => "monster"`);
      await this.actor.update({ 'type': 'monster' });
    }
    
    const html = this.element;
    
    if (html && html.length) {
      const system = this.actor.system;
      
      // Force actor to recalculate derived data
      if (!system.derived) {
//////         console.log(`_render: No derived data for actor ${this.actor.name}`);
        await this.actor.update({});
      }
      
//////       console.log('Actor data:', this.actor);
//////       console.log('Actor custom:', this.actor.system.custom);
//////       console.log('Actor derived:', this.actor.system.derived);
//////       console.log('Actor battle wear:', this.actor.system.battleWear);
      
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
      
//////       console.log(`Monster Sheet: Setting battle wear - Weapon: ${weaponWear}, Armor: ${armorWear}`);
      
      // Set the battle wear value displays
      html.find('.battle-wear-value').each((i, el) => {
        const valueElement = $(el);
        const parent = valueElement.closest('.battle-wear-control');
        const type = parent.find('button').data('type');
        
//////         console.log(`Found battle wear element #${i}, type: ${type}, current text: '${valueElement.text()}'`);
        
        if (type === 'weapon') {
          valueElement.text(weaponWear);
//////           console.log(`Set weapon wear to: ${weaponWear}`);
        } else if (type === 'armor') {
          valueElement.text(armorWear);
//////           console.log(`Set armor wear to: ${armorWear}`);
        }
      });
      
      // Update attribute circles and derived stats
      this._setupAttributeCircles(html);
      this._updateDerivedDisplay(html);
      
      // Make sure battle wear displays are up-to-date
      this._updateBattleWearDisplays(html);
    }
    
    return result;
  }

  /** @override */
  getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // Ensure CONFIG.WITCH_IRON and its properties are accessed safely
    const witchIronConfig = CONFIG.WITCH_IRON || {};
    context.config = witchIronConfig;

    // Prepare conditions for the #each helper
    context.conditions = {};
    const conditionsData = actorData.system.conditions || {};
    for (const condKey in conditionsData) {
      context.conditions[condKey] = {
        label: this.capitalize(condKey),
        value: conditionsData[condKey].value
      };
    }

    // Prepare armor types for select
    const armorTypesConfig = witchIronConfig.armorTypes || {};
    context.armorTypes = Object.entries(armorTypesConfig).map(([key, label]) => ({ key, label }));

    // Prepare weapon types for select
    const weaponTypesConfig = witchIronConfig.weaponTypes || {};
    context.weaponTypes = Object.entries(weaponTypesConfig).map(([key, label]) => ({ key, label }));

    // Prepare sizes for select
    const sizesConfig = witchIronConfig.sizes || {};
    context.sizes = Object.entries(sizesConfig).map(([key, label]) => ({ key, label }));

    // Add actor's items to the context
    context.items = actorData.items;
    // Add derived data to the context
    context.derived = this.actor.system.derived;
    // Add custom attributes to the context
    context.customAttributes = this.actor.system.customAttributes;

    // Set the isGM flag for template
    context.isGM = game.user.isGM;

    // Debugging information for derived data
    context.debugInfo = {
      derivedData: JSON.stringify(this.actor.system.derived, null, 2),
      battleWear: JSON.stringify(this.actor.system.battleWear, null, 2)
    };
    
    // Add hit dice options
    context.hitDiceOptions = {};
    for (let i = 1; i <= 20; i++) {
      context.hitDiceOptions[i] = i;
    }
    
    // Add items categorized by type
    context.injuries = actorData.items.filter(item => item.type === 'injury');
    
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Bind condition quarrel click even when sheet is not editable
    html.find('.cond-quarrel').click(this._onConditionQuarrel.bind(this));
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
    
    hitDiceSelect.change(this._onHitDiceChange.bind(this));
    
    // Add listeners for other dropdowns
    html.find('select[name="system.stats.size.value"]').change(this._onSizeChange.bind(this));
    html.find('select[name="system.stats.weaponType.value"]').change(this._onWeaponTypeChange.bind(this));
    html.find('select[name="system.stats.armorType.value"]').change(this._onArmorTypeChange.bind(this));
    
    // Item management listeners
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Condition increment/decrement and quarrel click handlers
    html.find('.cond-plus').click(this._onConditionPlus.bind(this));
    html.find('.cond-minus').click(this._onConditionMinus.bind(this));
    html.find('.cond-value').change(this._onConditionInput.bind(this));

    // Listener for flaw input
    const flawInput = html.find('textarea[name="system.details.flaw"]');
    flawInput.on('change', async (event) => {
      const newFlaw = event.currentTarget.value;
      await this.actor.update({ 'system.details.flaw': newFlaw });
    });

    // Listener for notes input
    const notesInput = html.find('textarea[name="system.details.notes"]');
    notesInput.on('change', async (event) => {
      const newNotes = event.currentTarget.value;
      await this.actor.update({ 'system.details.notes': newNotes });
    });

    // Initialize battle wear displays
    this._updateBattleWearDisplays(html);
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
    const attributeData = this.actor.system.customAttributes?.[attributeKey];
    if (!attributeData) return;
    
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
//////     console.log("Setting up Monster attribute circles for:", this.actor.name);
//////     console.log("Actor system data:", this.actor.system);
//////     console.log("Derived ability score:", this.actor.system.derived?.abilityScore);
    
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
  async _rollSpecializedCheck() {
    if (!this.actor.rollMonsterCheck) return;
    const defaultHits = this.actor.system.derived?.plusHits || 0;
    const opts = await openModifierDialog(this.actor, {
      title: "Specialized Check",
      defaultHits
    });
    if (opts) {
      this.actor.rollMonsterCheck({
        label: "Specialized Check",
        ...opts,
        additionalHits: defaultHits + (opts.additionalHits || 0)
      });
    }
  }
  
  /**
   * Roll a general check for the monster
   * @private
   */
  async _rollGeneralCheck() {
    if (!this.actor.rollMonsterCheck) return;
    const opts = await openModifierDialog(this.actor, { title: "General Check" });
    if (opts) {
      this.actor.rollMonsterCheck({ label: "General Check", ...opts });
    }
  }
  
  /**
   * Roll an inept check for the monster
   * @private
   */
  async _rollIneptCheck() {
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
    
    if (!this.actor.rollMonsterCheck) return;
    const opts = await openModifierDialog(this.actor, {
      title: "Inept Check",
    });
    if (opts) {
      const situationalMod = (opts.situationalMod || 0) + penalty;
      this.actor.rollMonsterCheck({ label: "Inept Check", ...opts, situationalMod });
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
    const li = event.currentTarget.closest(".quality");
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
    
//////     console.log(`Hit Dice changed to ${newHD}`);
    
    try {
      // Update the actor with the new HD value
      await this.actor.update({ 'system.stats.hitDice.value': newHD });
//////       console.log("Updated actor with new HD:", newHD);
      
      // Verify the update was successful
//////       console.log("Current HD value after update:", this.actor.system.stats.hitDice.value);
      
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
//////     console.log("Updating derived display for:", this.actor.name);
//////     console.log("Current derived stats:", this.actor.system.derived);
    
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
//////           console.log(`Updating ${label} to ${value}`);
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
    
//////     console.log(`Size changed to ${newSize}`);
    
    try {
      // Update the actor with the new size value
      await this.actor.update({ 'system.stats.size.value': newSize });
//////       console.log("Updated actor with new size:", newSize);
      
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
    
//////     console.log(`Weapon type changed to ${newWeaponType}`);
    
    try {
      // Update the actor with the new weapon type value
      await this.actor.update({ 'system.stats.weaponType.value': newWeaponType });
//////       console.log("Updated actor with new weapon type:", newWeaponType);
      
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
    
//////     console.log(`Armor type changed to ${newArmorType}`);
    
    try {
      // Update the actor with the new armor type value
      await this.actor.update({ 'system.stats.armorType.value': newArmorType });
//////       console.log("Updated actor with new armor type:", newArmorType);
      
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
  async _onMeleeAttack(event) {
    event.preventDefault();
    
//////     console.log(`Witch Iron | Performing melee attack for monster ${this.actor.name}`);
    
    // Ensure the actor's combat check flag is set to true before rolling
    // This is crucial because the quarrel system checks this flag on the actor itself
    if (this.actor.system.flags && (this.actor.system.flags.isCombatCheck === undefined || this.actor.system.flags.isCombatCheck === false)) {
//////       console.log(`Witch Iron | Setting isCombatCheck flag to true for ${this.actor.name}`);
      this.actor.update({'system.flags.isCombatCheck': true});
    }
    
    if (!this.actor.rollMonsterCheck) {
      console.error(`Witch Iron | ERROR: Actor ${this.actor.name} does not have rollMonsterCheck method`);
      return;
    }

    const defaultHits = this.actor.system.derived?.plusHits || 0;
    const opts = await openModifierDialog(this.actor, {
      title: "Melee Attack",
      defaultHits
    });
    if (opts) {
      const additionalHits = defaultHits + (opts.additionalHits || 0);
      this.actor.rollMonsterCheck({
        label: "Melee Attack",
        ...opts,
        isCombatCheck: true,
        additionalHits
      });
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

    // Special handling for injury type
    if (type === "injury") {
      const savedDefaults = game.settings.get("witch-iron", "injurySheetDefaults") || {};
      const system = {
        description: "",
        effect: "",
        location: "",
        severity: { value: 1 }
      };
      foundry.utils.mergeObject(system, savedDefaults, { inplace: true });
      const name = savedDefaults.name !== undefined ? savedDefaults.name : "New Injury";
      return createItem(this.actor, type, { name, img: "icons/svg/blood.svg", system });
    }

    return createItem(this.actor, type);
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
  async _onItemDelete(event) {
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
//////       console.log(`${type} wear is already at maximum (${maxWear})`);
      return;
    }
    
    // Calculate new wear value
    const newWear = Math.min(maxWear, currentWear + 1);
//////     console.log(`Increasing ${type} wear from ${currentWear} to ${newWear}`);
    
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
//////       console.log(`${type} wear is already at minimum (0)`);
      return;
    }
    
    // Calculate new wear value
    const newWear = Math.max(0, currentWear - 1);
//////     console.log(`Decreasing ${type} wear from ${currentWear} to ${newWear}`);
    
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
//////       console.log(`${type} wear is already at 0`);
      return;
    }
    
    // Prepare update data
    const updateData = {};
    updateData[`system.battleWear.${type}.value`] = 0;
    
    // Update the actor
    await this.actor.update(updateData);
//////     console.log(`Reset ${type} wear from ${currentWear} to 0`);
    
    // Force refresh
    this._updateBattleWearDisplays();
  }

  /**
   * Update the battle wear displays with current values
   * @param {jQuery} html - The HTML element of the sheet, or null to use this.element.
   * @private
   */
  _updateBattleWearDisplays(html) {
    html = html || this.element;
    if (!html || html.length === 0) {
        console.warn("Witch Iron | _updateBattleWearDisplays called with no HTML element available.");
        return;
    }

    const actorData = this.actor.system;
    console.log("Updating battle wear displays - Weapon: " + (actorData.battleWear?.weapon?.value || 0) + 
                ", Armor: " + (actorData.battleWear?.armor?.value || 0));
    console.log("Actor's full battleWear data:", actorData.battleWear);
    
    // Force actor to recalculate derived data
    this.actor.prepareData();
    
    const battleWearElements = html.find('.battle-wear-value');
    console.log(`Found ${battleWearElements.length} battle wear value elements`);
    
    if (battleWearElements.length === 0) {
        console.warn("No battle wear elements found in the sheet");
        return;
    }
    
    // Get fresh battle wear values from the actor
    // Force default to 0 for both weapon and armor wear
    let weaponWear = actorData.battleWear?.weapon?.value;
    let armorWear = actorData.battleWear?.armor?.value;
    
    // Ensure values are numbers and default to 0
    weaponWear = Number(weaponWear) || 0;
    armorWear = Number(armorWear) || 0;
    
    // Get the current weapon and armor types
    const weaponType = actorData.stats.weaponType?.value || "unarmed";
    const armorType = actorData.stats.armorType?.value || "none";
    
    // If armor type is "none", force armor wear to 0
    if (armorType === "none" && armorWear !== 0) {
//////         console.log(`Armor type is "none", forcing armor wear from ${armorWear} to 0`);
        armorWear = 0;
        this.actor.update({"system.battleWear.armor.value": 0});
    }
    
    // If values are unexpectedly high for a new monster, reset them to 0
    if (weaponWear > 0 && !actorData.derived?.weaponBonusMax) {
//////         console.log(`Resetting unexpected weapon wear value of ${weaponWear} to 0`);
        weaponWear = 0;
        this.actor.update({"system.battleWear.weapon.value": 0});
    }
    
    if (armorWear > 0 && !actorData.derived?.armorBonusMax) {
//////         console.log(`Resetting unexpected armor wear value of ${armorWear} to 0`);
        armorWear = 0;
        this.actor.update({"system.battleWear.armor.value": 0});
    }
    
//////     console.log(`Using weapon wear: ${weaponWear}, armor wear: ${armorWear}`);
    
    // Process each battle wear element
    battleWearElements.each((i, el) => {
        const element = $(el);
        const type = element.data('type');
        const currentText = element.text();
//////         console.log(`Processing element #${i}, type: ${type}, current text: '${currentText}'`);
        
        if (type === 'weapon') {
            // Update weapon wear display
            const newText = `${weaponWear}`;
//////             console.log(`Set weapon wear display to: ${newText} (was: ${currentText})`);
            element.text(newText);
        } else if (type === 'armor') {
            // Update armor wear display
            const newText = `${armorWear}`;
//////             console.log(`Set armor wear display to: ${newText} (was: ${currentText})`);
            element.text(newText);
        }
    });
    
    // Update button states based on current values
    this._updateBattleWearButtonStates();
    
//////     console.log("Battle wear displays updated successfully");
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
    
//////     console.log("Battle wear button states updated");
  }

  /**
   * Initiate a condition quarrel: show description, then register as non-combat quarrel
   * @param {Event} event
   */
  async _onConditionQuarrel(event) {
    event.preventDefault();
    const actor = this.actor;
    const conditionName = event.currentTarget.closest('.condition-row').dataset.condition;

    let rating = 0;
    let skillName = "";
    let resultMessages = {};

    if (["blind", "deaf", "pain"].includes(conditionName)) {
      rating = actor.system.conditions[conditionName]?.value || 0;
      const condLabel = this.capitalize(conditionName);
      const penalty = rating * 10;
      const checkType = conditionName === "blind" ? "Sight-based Checks" :
                        conditionName === "deaf" ? "Hearing & Speech-based Checks" :
                        "All Checks";
      const removal = conditionName === "blind" ? "Cleaning out the eyes" :
                      conditionName === "deaf" ? "Removing blockage" :
                      "A form of painkiller";

      const iconMap = {
        blind: "fa-eye-slash",
        deaf: "fa-ear-deaf",
        pain: "fa-hand-holding-medical"
      };
      const iconClass = iconMap[conditionName] || "fa-info-circle";

      const descMap = {
        blind: "Retina Overload.",
        deaf: "Ringing in Ears.",
        pain: "Agony."
      };
      const descIntro = descMap[conditionName] || "";

      const content = `
        <div class="witch-iron chat-card condition-card">
          <div class="card-header">
            <i class="fas ${iconClass}"></i>
            <h3>${actor.name} - ${condLabel}</h3>
          </div>
          <div class="card-content">
            <p>${descIntro} This Condition inflicts a <strong>${penalty}%</strong> Check penalty. Passively reduce by one each hour.</p>
            <p><strong>Impairs:</strong> ${checkType}.</p>
            <p><strong>Removed by:</strong> ${removal}.</p>
          </div>
        </div>`;

      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor }),
        content
      };
      return ChatMessage.create(chatData);
    }

    if (["aflame", "bleed", "poison"].includes(conditionName)) {
      skillName = "Hardship";
      rating = ["aflame", "bleed", "poison"].reduce((sum, c) => sum + (actor.system.conditions[c]?.value || 0), 0);
      resultMessages = {
        success: "The afflictions consume the monster!",
        failure: "The monster overcomes its afflictions.",
        cost: "The monster survives, but at great cost."
      };
    } else if (conditionName === "stress") {
      skillName = "Steel";
      rating = actor.system.conditions.stress?.value || 0;
      resultMessages = {
        success: "The monster's mind breaks! It gains a Madness.",
        failure: "The monster steels its mind, avoiding Madness.",
        cost: "The monster holds on, but something snaps."
      };
    } else if (conditionName === "corruption") {
      skillName = "Steel";
      rating = actor.system.conditions.corruption?.value || 0;
      resultMessages = {
        success: "Corruption takes hold! The monster gains a Mutation.",
        failure: "The monster purges the corruption, avoiding Mutation.",
        cost: "The monster pushes back the corruption, but at a price."
      };
    }

    if (!skillName) {
      console.error(`Witch Iron | Unknown condition for quarrel: ${conditionName}`);
      return;
    }

    // Log the parameters being sent to manualQuarrel
    console.log(`Witch Iron | Initiating Condition Quarrel: Condition=${conditionName}, Skill=${skillName}, Rating=${rating}`);
    console.log(`Witch Iron | Result Messages:`, resultMessages);

    // Setup the condition's side of the quarrel
    const monsterToken = this.actor.getActiveTokens()[0] || null; // Get the first active token, or null

    const customParameters = {
        actorId: this.actor.id,   // Add the source actor's ID
        hits: rating,             // The 'roll' or power level of the condition
        skill: skillName,         // The skill the condition tests (e.g., Hardship), also for sourceCheckData
        resultMessages: resultMessages,
        isConditionQuarrel: true, // Flag this as a condition-initiated quarrel
        condition: conditionName  // Specific condition (e.g., aflame, stress) to trigger condition quarrel logic
    };

    // Correctly call manualQuarrel with sourceCheckData (customParameters) and targetToken (monsterToken)
    await manualQuarrel(customParameters, monsterToken);

    // Now, make the monster roll its Specialized check against the condition
    // The quarrel system should pick up this roll and resolve it against the pending condition quarrel.
    console.log(`Witch Iron | Rolling Specialized Check for actor ${actor.name} against condition ${conditionName}`);
    this._rollSpecializedCheck(); 

  }

  /**
   * Increase a condition value.
   * @param {Event} event
   * @private
   */
  async _onConditionPlus(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const row = event.currentTarget.closest('.condition-row');
    const cond = row.dataset.condition;
    const input = row.querySelector('input.cond-value');
    let current = parseInt(input?.value) || this.actor.system.conditions?.[cond]?.value || 0;
    const value = current + 1;
    if (input) input.value = value;
    await this.actor.update({ [`system.conditions.${cond}.value`]: value });
  }

  /**
   * Decrease a condition value.
   * @param {Event} event
   * @private
   */
  async _onConditionMinus(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const row = event.currentTarget.closest('.condition-row');
    const cond = row.dataset.condition;
    const input = row.querySelector('input.cond-value');
    let current = parseInt(input?.value) || this.actor.system.conditions?.[cond]?.value || 0;
    const value = Math.max(0, current - 1);
    if (input) input.value = value;
    await this.actor.update({ [`system.conditions.${cond}.value`]: value });
  }

  /**
   * Handle manual input change for a condition value.
   * @param {Event} event
   * @private
   */
  async _onConditionInput(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const input = event.currentTarget;
    const row = input.closest('.condition-row');
    const cond = row.dataset.condition;
    let value = parseInt(input.value) || 0;
    value = Math.max(0, value);
    input.value = value; // Ensure the input field reflects the sanitized value
    await this.actor.update({ [`system.conditions.${cond}.value`]: value });
  }
}

/**
 * Add a hook to update battle wear displays when actor data changes
 */
Hooks.on("updateActor", (actor, changes, options, userId) => {
    console.log(`WITCH IRON | updateActor hook fired for actor: ${actor.name}. UserID: ${userId}. Game User ID: ${game.user.id}`);
    console.log("WITCH IRON | updateActor hook - All changes:", changes);

    // Only process if this is our client's update
    if (game.user.id !== userId) {
        console.log("WITCH IRON | updateActor hook: Update was for a different user. Skipping.");
        return;
    }
    
    const sheet = actor.sheet;
    if (sheet?.rendered) { // Ensure sheet exists and is rendered
        console.log(`WITCH IRON | updateActor hook: Sheet for ${actor.name} is rendered.`);
        const html = sheet.element;

        // Refresh condition inputs if condition values changed
        if (changes.system?.conditions) {
            console.log("WITCH IRON | updateActor hook: Condition changes detected in changes object:", changes.system.conditions);
            for (const [cond, detail] of Object.entries(changes.system.conditions)) {
                if (detail?.value !== undefined) {
                    console.log(`WITCH IRON | updateActor hook: Attempting to update ${cond} to ${detail.value}`);
                    const displayElement = html.find(`.condition-row[data-condition="${cond}"] .cond-value`);
                    if (displayElement.length) {
                        displayElement.text(detail.value); // Changed from .val() to .text()
                        console.log(`WITCH IRON | updateActor hook: ${cond} display element found and text set.`);
                    } else {
                        console.log(`WITCH IRON | updateActor hook: ${cond} display element NOT found.`);
                    }
                }
            }
        } else {
            console.log("WITCH IRON | updateActor hook: No 'changes.system.conditions' found in the changes object.");
        }
        
        // Check if battle wear values have changed
        const hasBattleWearChanges = changes.system?.battleWear || 
                                (changes.system?.derived?.weaponBonusEffective !== undefined) ||
                                (changes.system?.derived?.armorBonusEffective !== undefined);
        
        if (hasBattleWearChanges) {
            console.log(`WITCH IRON | updateActor hook: Battle wear changes detected for ${actor.name}.`);
            // Force the actor to recalculate derived data
            actor.prepareData();
            
            // See if the actor has an open sheet
            // const sheet = actor.sheet; // already defined
            if (sheet._updateBattleWearDisplays && typeof sheet._updateBattleWearDisplays === 'function') {
                sheet._updateBattleWearDisplays();
            }
        }

    } else {
        console.log(`WITCH IRON | updateActor hook: Sheet for ${actor.name} is NOT rendered or 'sheet' is undefined.`);
    }
}); 
