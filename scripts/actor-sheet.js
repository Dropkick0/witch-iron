import { createItem, showModifierDialog } from "./utils.js";

/**
 * Extends the basic ActorSheet for Witch Iron actor sheets.
 * @extends {ActorSheet}
 */
export class WitchIronActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "actor"],
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  /** @override */
  get template() {
    return `systems/witch-iron/templates/actors/${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Basic data
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    const systemData = actorData.system;
    context.system = systemData;
    context.flags = actorData.flags;

    // Add actor type specific data
    this._prepareItems(context);
    if (this.actor.type === 'descendant') this._prepareDescendantData(context);
    if (this.actor.type === 'monster') this._prepareMonsterData(context);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   * @param {Object} context The actor data being prepared.
   */
  _prepareItems(context) {
    // Initialize containers
    const injuries = [];
    const weapons = [];
    const armor = [];
    const gear = [];
    const consumables = [];
    const artifacts = [];
    const mutations = [];
    const madness = [];

    // Categorize items
    for (let i of context.items) {
      // Enrich HTML description if it exists
      if (i.system.description) {
        i.system.description = TextEditor.enrichHTML(i.system.description, {secrets: this.actor.isOwner, async: false});
      }
      
      // Sort items by type
      switch (i.type) {
        case 'injury':
          injuries.push(i);
          break;
        case 'weapon':
          weapons.push(i);
          break;
        case 'armor':
          armor.push(i);
          break;
        case 'gear':
          gear.push(i);
          break;
        case 'consumable':
          consumables.push(i);
          break;
        case 'artifact':
          artifacts.push(i);
          break;
        case 'mutation':
          mutations.push(i);
          break;
        case 'madness':
          madness.push(i);
          break;
      }
    }

    // Assign to context
    context.injuries = injuries;
    context.weapons = weapons;
    context.armor = armor;
    context.gear = gear;
    context.consumables = consumables;
    context.artifacts = artifacts;
    context.mutations = mutations;
    context.madness = madness;
  }

  /**
   * Prepare data for Descendant type actors
   * @param {Object} context The actor data being prepared
   */
  _prepareDescendantData(context) {
    // Add any additional context data needed for the descendant sheet
  }

  /**
   * Prepare data for Monster type actors
   * @param {Object} context The actor data being prepared
   */
  _prepareMonsterData(context) {
    // Add dropdown options
    context.sizes = {
      tiny: "Tiny",
      small: "Small",
      medium: "Medium",
      large: "Large",
      huge: "Huge",
      gigantic: "Gigantic"
    };

    context.weaponTypes = {
      none: "None",
      light: "Light",
      medium: "Medium",
      heavy: "Heavy",
      superheavy: "Superheavy"
    };

    context.armorTypes = {
      none: "None",
      light: "Light",
      medium: "Medium",
      heavy: "Heavy",
      superheavy: "Superheavy"
    };

    // Create hit dice options array (this is no longer needed with selectOptions helper)
    // context.hitDiceOptions = [];
    // for (let i = 1; i <= 20; i++) {
    //   context.hitDiceOptions.push(i);
    // }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

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
      const itemId = li.data("itemId");
      this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => this._onEffectControl(ev));

    // Skill Roll
    html.find('.roll-skill').click(this._onRollSkill.bind(this));

    // Attribute Roll
    html.find('.roll-attribute').click(this._onRollAttribute.bind(this));
    
    // Monster Roll
    html.find('.monster-roll').click(this._onMonsterRoll.bind(this));
    
    // Monster Sheet - Add Quality
    html.find('.add-quality').click(ev => {
      ev.preventDefault();
      const qualities = this.actor.system.traits.specialQualities || [];
      qualities.push("");
      this.actor.update({ "system.traits.specialQualities": qualities });
    });
    
    // Monster Sheet - Delete Quality
    html.find('.delete-quality').click(ev => {
      ev.preventDefault();
      const li = $(ev.currentTarget).parents(".quality");
      const index = li.data("index");
      const qualities = duplicate(this.actor.system.traits.specialQualities || []);
      qualities.splice(index, 1);
      this.actor.update({ "system.traits.specialQualities": qualities });
    });
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;

    // Use any data attributes as the initial system data
    const data = duplicate(header.dataset);
    delete data["type"];

    // Utilize shared helper to create the item
    return createItem(this.actor, type, { system: data });
  }

  /**
   * Handle skill roll button click
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollSkill(event) {
    event.preventDefault();
    const skill = event.currentTarget.dataset.skill;
    const title = `Skill Check: ${skill.charAt(0).toUpperCase() + skill.slice(1)}`;

    this._openRollDialog(title, opts => this.actor.rollSkill(skill, opts));
  }

  /**
   * Handle attribute roll button click
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollAttribute(event) {
    event.preventDefault();
    const attribute = event.currentTarget.dataset.attribute;
    const title = `Attribute Check: ${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`;
    this._openRollDialog(title, opts => this.actor.rollAttribute(attribute, opts));
  }

  /**
   * Helper to present a modifier dialog and execute a callback with the results
   * @param {string} title Dialog title
   * @param {Function} rollCallback Callback receiving the collected options
   * @private
   */
  _openRollDialog(title, rollCallback) {
    showModifierDialog(title, rollCallback);
  }

  /**
   * Handle monster roll button click
   * @param {Event} event   The originating click event
   * @private
   */
  _onMonsterRoll(event) {
    event.preventDefault();
    
    // Create dialog to ask for modifiers
    const content = `
      <form>
        <div class="form-group">
          <label>Roll Label</label>
          <input type="text" name="label" value="Monster Check" />
        </div>
        <h3>Target Number Modifiers</h3>
        <div class="form-group">
          <label>Difficulty</label>
          <select name="difficulty">
            <option value="40">Very Easy +40%</option>
            <option value="20">Easy +20%</option>
            <option value="0" selected>Normal +0%</option>
            <option value="-20">Hard -20%</option>
            <option value="-40">Very Hard -40%</option>
          </select>
        </div>
        <div class="form-group">
          <label>Situational Modifier</label>
          <input type="number" name="situationalMod" value="0" step="10" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="condBlind"/> Blind Rating</label>
          <input type="number" name="blindRating" value="0" min="0" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="condDeaf"/> Deaf Rating</label>
          <input type="number" name="deafRating" value="0" min="0" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="condPain" checked/> Pain Rating</label>
          <input type="number" name="painRating" value="0" min="0" />
        </div>
        <h3>Hits Modifiers</h3>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="0" />
        </div>
      </form>
    `;
    
    const dialog = new Dialog({
      title: "Monster Roll",
      content: content,
      classes: ["witch-iron", "modifier-dialog"],
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Roll",
          callback: html => {
            const form = html.find("form")[0];
            const label = form.label.value;
            let situationalMod = parseInt(form.situationalMod.value) || 0;
            const diffMod = parseInt(form.difficulty.value) || 0;
            const additionalHits = parseInt(form.additionalHits.value) || 0;

            if (form.condBlind.checked) {
              situationalMod -= 10 * (parseInt(form.blindRating.value) || 0);
            }
            if (form.condDeaf.checked) {
              situationalMod -= 10 * (parseInt(form.deafRating.value) || 0);
            }
            if (form.condPain.checked) {
              situationalMod -= 10 * (parseInt(form.painRating.value) || 0);
            }
            situationalMod += diffMod;
            
            // Use the actor's rollMonsterCheck method which handles monster
            // checks. The previous call attempted to use a non-existent
            // `monsterRoll` method which resulted in an error when the dialog
            // was confirmed.
            if (typeof this.actor.rollMonsterCheck === "function") {
              this.actor.rollMonsterCheck({
                label,
                situationalMod,
                additionalHits
              });
            } else {
              console.error(
                `Witch Iron | ERROR: Actor ${this.actor.name} does not have rollMonsterCheck method`
              );
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "roll"
    });
    
    dialog.render(true);
  }
} 