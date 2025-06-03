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
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
      submitOnChange: false,
      submitOnClose: true,
      closeOnSubmit: true
    });
  }

  /** @override */
  get template() {
    return "systems/witch-iron/templates/items/injury-sheet.hbs";
  }

  /** @override */
  async getData(options = {}) {
    const context = super.getData(options);
    // Expose the raw system data for binding
    context.system = context.item.system;
    // Coerce severity to string for select matching
    if (context.system.severity?.value !== undefined) {
      context.system.severity.value = String(context.system.severity.value);
    }
    // Ensure conditions is always an array
    context.system.conditions = Array.isArray(context.system.conditions)
      ? context.system.conditions.slice()
      : [];
    // Seed a blank entry if no conditions exist
    if (context.system.conditions.length === 0) {
      context.system.conditions.push({ type: "", rating: 1 });
    }
    // Preserve flags
    context.flags = context.item.flags;
    // Provide options for template
    context.locationOptions = {
      head: "Head", torso: "Torso", arm: "Arm", leg: "Leg",
      jaw: "Jaw", nose: "Nose", ear: "Ear", eye: "Eye",
      neck: "Neck", skull: "Skull", shoulder: "Shoulder",
      pelvis: "Pelvis", cage: "Ribcage", guts: "Guts",
      liver: "Liver/Kidney", heart: "Heart/Lung",
      hand: "Hand", forearm: "Forearm", upperarm: "Upper Arm",
      foot: "Foot", shin: "Shin", thigh: "Thigh"
    };
    context.severityOptions = {
      1: "1", 2: "2", 3: "3",
      4: "4", 5: "5", 6: "6",
      7: "7", 8: "8", 9: "9",
      10: "10"
    };
    context.medicalOptions = {
      aid: "Medical Aid", surgery: "Surgery", advanced: "Advanced Surgery"
    };
    context.conditionOptions = {
      pain: "Pain", bleed: "Bleed", trauma: "Trauma",
      deaf: "Deaf", blind: "Blind", aflame: "Aflame",
      corruption: "Corruption", fatigue: "Fatigue",
      entangle: "Entangle", poison: "Poison",
      stun: "Stun", helpless: "Helpless", prone: "Fall Prone",
      disarm: "Disarmed", lost: "Lost Body Part", dead: "Dead",
      speechless: "Speechless", suffocate: "Suffocate"
    };
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Handle specific injury sheet interactions
    html.on('change', 'select.condition-type', this._onConditionTypeChange.bind(this));
    html.on('click', '.add-condition', this._onAddCondition.bind(this));
    html.on('click', '.condition-remove', this._onConditionRemove.bind(this));
    // Manually populate saved values for location, severity, and conditions
    const data = this.item.system;
    // Location & Severity
    html.find('select[name="system.location"]').val(data.location);
    html.find('select[name="system.severity.value"]').val(String(data.severity.value));
    // Effect
    html.find('textarea[name="system.effect"]').val(data.effect);
    // Populate existing conditions
    const conds = Array.isArray(data.conditions) ? data.conditions : [];
    conds.forEach((cond, idx) => {
      const row = html.find('.condition-selection').eq(idx);
      row.find('select.condition-type').val(cond.type).change();
      row.find('input.condition-rating').val(cond.rating);
    });
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
    
    // Allow rating for all conditions except Prone
    const hasRating = !!conditionType && conditionType !== 'prone';
    ratingInput.disabled = !hasRating;
    
    if (!hasRating) {
      ratingInput.value = '';
    } else if (ratingInput.value === '') {
      ratingInput.value = '1';
    }
  }

  /**
   * Add a blank condition row to the conditions array and re-render
   */
  _onAddCondition(event) {
    event.preventDefault();
    // Clone the first condition-selection row for the UI and reset its fields
    const container = this.element.find('.conditions-container');
    const rows = container.find('.condition-selection');
    const idx = rows.length;
    const template = rows.first().clone();
    // Reset select and rating input
    const select = template.find('select.condition-type').val('');
    select.prop('disabled', false);
    const input = template.find('input.condition-rating').val(1).prop('disabled', true);
    input.removeAttr('max');
    // Update name attributes for form submission
    select.attr('name', `system.conditions.${idx}.type`);
    input.attr('name', `system.conditions.${idx}.rating`);
    // Insert before the Add button
    container.find('button.add-condition').before(template);
  }

  /**
   * Remove a condition at the clicked index and re-render
   */
  _onConditionRemove(event) {
    event.preventDefault();
    // Remove the clicked row from the UI
    const rowEl = event.currentTarget.closest('.condition-selection');
    $(rowEl).remove();
    // Re-index remaining rows for correct form field names
    this.element.find('.condition-selection').each((i, el) => {
      const sel = el.querySelector('select.condition-type');
      const inp = el.querySelector('input.condition-rating');
      sel.name = `system.conditions.${i}.type`;
      inp.name = `system.conditions.${i}.rating`;
    });
  }

  /** @override */
  async _updateObject(event, formData) {
    // Rebuild the conditions array from individual formData entries
    const condKeys = Object.keys(formData).filter(k => k.startsWith("system.conditions."));
    if (condKeys.length) {
      const indices = new Set();
      condKeys.forEach(key => {
        const m = key.match(/^system\.conditions\.(\d+)\./);
        if (m) indices.add(Number(m[1]));
      });
      // Build sorted conditions array
      const newConds = Array.from(indices).sort((a,b) => a-b).map(i => {
        const type = formData[`system.conditions.${i}.type`] || "";
        const rating = parseInt(formData[`system.conditions.${i}.rating`], 10) || 1;
        return { type, rating };
      });
      // Assign the reconstructed array
      formData['system.conditions'] = newConds;
      // Remove individual keys to prevent redundant updates
      indices.forEach(i => {
        delete formData[`system.conditions.${i}.type`];
        delete formData[`system.conditions.${i}.rating`];
      });
    }
    // Call original update to persist all form fields
    await super._updateObject(event, formData);
  }
} 