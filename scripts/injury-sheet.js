/**
 * Injury Sheet class for Witch Iron system
 */
export class WitchIronInjurySheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "item", "injury"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}]
    });
  }

  /** @override */
  get template() {
    return "systems/witch-iron/templates/items/injury-sheet.hbs";
  }

  /** @override */
  async getData() {
    const data = super.getData();
    
    // Add derived data for the template
    data.locationOptions = {
      "head": "Head",
      "torso": "Torso",
      "arm": "Arm",
      "leg": "Leg",
      "jaw": "Jaw",
      "nose": "Nose",
      "ear": "Ear",
      "eye": "Eye",
      "neck": "Neck",
      "skull": "Skull",
      "shoulder": "Shoulder",
      "pelvis": "Pelvis",
      "cage": "Ribcage",
      "guts": "Guts", 
      "liver": "Liver/Kidney",
      "heart": "Heart/Lung",
      "hand": "Hand",
      "forearm": "Forearm",
      "upperarm": "Upper Arm",
      "foot": "Foot",
      "shin": "Shin",
      "thigh": "Thigh"
    };

    data.severityOptions = {
      1: "Minor (1)",
      2: "Moderate (2)",
      3: "Major (3)",
      4: "Severe (4)",
      5: "Critical (5)"
    };

    data.medicalOptions = {
      "aid": "Medical Aid",
      "surgery": "Surgery",
      "advanced": "Advanced Surgery"
    };

    data.conditionOptions = {
      "pain": "Pain",
      "bleed": "Bleed",
      "trauma": "Trauma",
      "deaf": "Deaf",
      "blind": "Blind",
      "prone": "Fall Prone",
      "stun": "Stun",
      "helpless": "Helpless",
      "disarm": "Disarmed",
      "lost": "Lost Body Part",
      "dead": "Dead",
      "speechless": "Speechless",
      "suffocate": "Suffocate",
      "poison": "Poison"
    };
    
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Handle specific injury sheet interactions
    html.find('.condition-type').change(this._onConditionTypeChange.bind(this));
  }

  /**
   * Handle condition type changes
   * @param {Event} event The originating change event
   * @private
   */
  async _onConditionTypeChange(event) {
    const select = event.currentTarget;
    const conditionType = select.value;
    
    // Adjust the UI based on condition type
    const conditionContainer = select.closest('.condition-selection');
    const ratingInput = conditionContainer.querySelector('.condition-rating');
    
    // Some conditions have ratings (Pain 1, Bleed 2, etc.), others don't (Dead, Prone)
    const hasRating = ['pain', 'bleed', 'trauma', 'stun', 'helpless'].includes(conditionType);
    ratingInput.disabled = !hasRating;
    
    if (!hasRating) {
      ratingInput.value = '';
    } else if (ratingInput.value === '') {
      ratingInput.value = '1';
    }
  }
} 