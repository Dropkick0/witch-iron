/**
 * Extends the basic ItemSheet for Witch Iron item sheets.
 * @extends {ItemSheet}
 */
export class WitchIronItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /** @override */
  get template() {
    const type = this.item.type;
    
    // Use a switch statement to match specific templates with known item types
    switch (type) {
      case 'injury':
        return `systems/witch-iron/templates/items/injury-sheet.hbs`;
      case 'weapon':
        return `systems/witch-iron/templates/items/weapon-sheet.hbs`;
      case 'armor':
        return `systems/witch-iron/templates/items/armor-sheet.hbs`;
      case 'gear':
        return `systems/witch-iron/templates/items/gear-sheet.hbs`;
      case 'consumable':
        return `systems/witch-iron/templates/items/consumable-sheet.hbs`;
      case 'artifact':
        return `systems/witch-iron/templates/items/artifact-sheet.hbs`;
      case 'mutation':
        return `systems/witch-iron/templates/items/mutation-sheet.hbs`;
      case 'madness':
        return `systems/witch-iron/templates/items/madness-sheet.hbs`;
      default:
        return `systems/witch-iron/templates/items/item-sheet.hbs`;
    }
  }
  
  /** @override */
  async _render(force=false, options={}) {
    // Add item type as a class to the sheet
    this.options.classes = ["witch-iron", "sheet", "item", this.item.type];
    return super._render(force, options);
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure
    const context = super.getData();
    const itemData = context.item.system;
    context.system = itemData;
    context.flags = context.item.flags;
    
    // Add additional info for specific item types
    if (context.item.type === 'injury') {
      // Add dropdown options for severity
      context.severityOptions = {
        "1": "Minor",
        "3": "Moderate",
        "5": "Severe"
      };
      
      // Add dropdown options for locations
      context.locationOptions = {
        "head": "Head",
        "jaw": "Jaw",
        "neck": "Neck",
        "arm": "Arm",
        "arms": "Arms",
        "torso": "Torso",
        "leg": "Leg",
        "legs": "Legs"
      };
      
      // Add options for conditions
      context.conditionOptions = {
        "pain": "Pain",
        "bleed": "Bleeding",
        "trauma": "Trauma",
        "stun": "Stunned",
        "helpless": "Helpless",
        "impaired": "Impaired"
      };
    }
    
    return context;
  }

  /** 
   * Prepare injury specific data
   */
  _prepareInjuryData(context) {
    // Ensure severity is within range
    const severity = context.system.severity?.value || 1;
    context.system.severity.value = Math.max(1, Math.min(10, severity));
    
    // Set severity class for styling
    // 1-3: Minor, 4-7: Major, 8-10: Severe
    let severityClass;
    if (severity <= 3) severityClass = "severity-minor";
    else if (severity <= 7) severityClass = "severity-major";
    else severityClass = "severity-severe";
    
    context.severityClass = severityClass;
    
    // Ensure medical option is set
    if (!context.system.medicalOption) context.system.medicalOption = "none";
    
    // Ensure condition fields are initialized
    if (!context.system.conditionType) context.system.conditionType = "";
    if (!context.system.conditionRating) context.system.conditionRating = 1;
    if (!context.system.conditionLocation) context.system.conditionLocation = "";
    if (!context.system.conditionRemoval) context.system.conditionRemoval = "";
    
    // Ensure effect and conditions fields are initialized if undefined
    if (context.system.effect === undefined) context.system.effect = "";
    if (context.system.conditions === undefined) context.system.conditions = "";
    
    // Prepare condition removal methods based on type for reference
    context.conditionRemovalMethods = {
      "aflame": "Washing or rolling it out",
      "bleed": "First aid or bandages",
      "poison": "Antidote or bloodletting",
      "blind": "Cleaning out the eyes",
      "deaf": "Removing blockage",
      "pain": "A form of painkiller",
      "corruption": "Painful purification",
      "stress": "Indulging in Vices",
      "fatigue": "A good night's rest",
      "entangle": "Slipping or breaking out",
      "helpless": "Receiving Damage",
      "stun": "Smelling salts",
      "prone": "Spending an action to stand up",
      "trauma": "Resting one month per Rating"
    };
  }

  /** 
   * Prepare weapon specific data
   */
  _prepareWeaponData(context) {
    // Add weapon specific data if needed
  }

  /** 
   * Prepare armor specific data
   */
  _prepareArmorData(context) {
    // Add armor specific data if needed
  }

  /**
   * Prepare gear specific data
   */
  _prepareGearData(context) {
    // Add gear specific data if needed
  }

  /**
   * Prepare consumable specific data
   */
  _prepareConsumableData(context) {
    // Add consumable specific data if needed
  }

  /**
   * Prepare artifact specific data
   */
  _prepareArtifactData(context) {
    context.stageOptions = {
      0: "Dormant",
      1: "Awakening",
      2: "Ascendant",
      3: "Transcendent"
    };
  }

  /**
   * Prepare mutation specific data
   */
  _prepareMutationData(context) {
    // Add mutation specific data if needed
  }

  /**
   * Prepare madness specific data
   */
  _prepareMadnessData(context) {
    // Add madness specific data if needed
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    
    // Handle specific injury interactions
    if (this.item.type === "injury") {
      // Handle severity changes to update color class
      html.find('input[name="system.severity.value"]').change(ev => {
        const severity = parseInt(ev.currentTarget.value);
        
        // Update the severity color class
        const labelElement = html.find('.severity-label');
        labelElement.removeClass('severity-minor severity-major severity-severe');
        
        // Apply appropriate class based on severity range
        if (severity <= 3) {
          labelElement.addClass('severity-minor');
        } else if (severity <= 7) {
          labelElement.addClass('severity-major');
        } else {
          labelElement.addClass('severity-severe');
        }
        
        // Update the display label text
        labelElement.text(`Severity ${severity}`);
      });
      
      // Handle condition type selection changes
      html.find('select[name="system.conditionType"]').change(ev => {
        const conditionType = ev.currentTarget.value;
        const ratingInput = html.find('input[name="system.conditionRating"]');
        const locationInput = html.find('input[name="system.conditionLocation"]');
        const removalTextarea = html.find('textarea[name="system.conditionRemoval"]');
        
        // Handle prone condition (no rating)
        if (conditionType === "prone") {
          ratingInput.prop("disabled", true);
          ratingInput.val("1");
        } else {
          ratingInput.prop("disabled", false);
        }
        
        // Handle trauma condition (needs location)
        if (conditionType === "trauma") {
          locationInput.prop("disabled", false);
        } else {
          locationInput.prop("disabled", true);
          locationInput.val("");
        }
        
        // Auto-populate removal method based on condition type
        const removalMethods = {
          "aflame": "Washing or rolling it out",
          "bleed": "First aid or bandages",
          "poison": "Antidote or bloodletting",
          "blind": "Cleaning out the eyes",
          "deaf": "Removing blockage",
          "pain": "A form of painkiller",
          "corruption": "Painful purification",
          "stress": "Indulging in Vices",
          "fatigue": "A good night's rest",
          "entangle": "Slipping or breaking out",
          "helpless": "Receiving Damage",
          "stun": "Smelling salts",
          "prone": "Spending an action to stand up",
          "trauma": "Resting one month per Rating"
        };
        
        if (removalMethods[conditionType]) {
          removalTextarea.val(removalMethods[conditionType]);
        }
      });
    }
    
    // Other item type specific listeners can be added in similar blocks
  }

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    return buttons;
  }
} 