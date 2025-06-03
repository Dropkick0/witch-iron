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
    
    // Grab any data associated with this control
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle skill roll button click
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skill = element.dataset.skill;
    
    // Get situational modifier if any (via dialog)
    const options = {
      situationalMod: 0,
      additionalHits: 0
    };
    
    // Create dialog to ask for modifiers
    const content = `
      <form>
        <div class="form-group">
          <label>Situational Modifier</label>
          <input type="number" name="situationalMod" value="0" step="10" />
        </div>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="0" />
        </div>
      </form>
    `;
    
    const dialog = new Dialog({
      title: `Skill Check: ${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
      content: content,
      buttons: {
        roll: {
          label: "Roll",
          callback: html => {
            const form = html[0].querySelector("form");
            options.situationalMod = parseInt(form.situationalMod.value) || 0;
            options.additionalHits = parseInt(form.additionalHits.value) || 0;
            this.actor.rollSkill(skill, options);
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "roll"
    });
    
    dialog.render(true);
  }

  /**
   * Handle attribute roll button click
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollAttribute(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const attribute = element.dataset.attribute;
    
    // Get situational modifier if any (via dialog)
    const options = {
      situationalMod: 0,
      additionalHits: 0
    };
    
    // Create dialog to ask for modifiers
    const content = `
      <form>
        <div class="form-group">
          <label>Situational Modifier</label>
          <input type="number" name="situationalMod" value="0" step="10" />
        </div>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="0" />
        </div>
      </form>
    `;
    
    const dialog = new Dialog({
      title: `Attribute Check: ${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`,
      content: content,
      buttons: {
        roll: {
          label: "Roll",
          callback: html => {
            const form = html[0].querySelector("form");
            options.situationalMod = parseInt(form.situationalMod.value) || 0;
            options.additionalHits = parseInt(form.additionalHits.value) || 0;
            this.actor.rollAttribute(attribute, options);
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "roll"
    });
    
    dialog.render(true);
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
        <div class="form-group">
          <label>Situational Modifier</label>
          <input type="number" name="situationalMod" value="0" step="10" />
        </div>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="0" />
        </div>
      </form>
    `;
    
    const dialog = new Dialog({
      title: "Monster Roll",
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Roll",
          callback: html => {
            const form = html.find("form")[0];
            const label = form.label.value;
            const situationalMod = parseInt(form.situationalMod.value) || 0;
            const additionalHits = parseInt(form.additionalHits.value) || 0;
            
            // Use the actor's rollMonsterCheck method which handles monster
            // checks. The previous call attempted to use a non-existent
            // `monsterRoll` method which resulted in an error when the dialog
            // was confirmed.
            if (typeof this.actor.rollMonsterCheck === "function") {
              this.actor.rollMonsterCheck({
                label: label,
                situationalMod: situationalMod,
                additionalHits: additionalHits
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