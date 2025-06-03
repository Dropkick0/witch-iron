import { createItem } from "./utils.js";

/**
 * Descendant sheet class for the Witch Iron system
 * @extends {ActorSheet}
 */
export class WitchIronDescendantSheet extends ActorSheet {
  // Add static property to track the open dialog
  static activeSpecDialog = null;

  /** @override */
  static get defaultOptions() {
    console.log("WitchIronDescendantSheet | Initializing sheet options");
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["witch-iron", "sheet", "descendant"],
      template: "systems/witch-iron/templates/actors/descendant-sheet.hbs",
      width: 720,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  /** @override */
  getData() {
    console.log("WitchIronDescendantSheet | Getting sheet data");
    // Retrieve the base data from the parent method
    const data = super.getData();
    console.log("WitchIronDescendantSheet | Sheet data:", data);
    const actorData = data.actor;

    // Add the actor's data to the sheet data
    data.system = actorData.system;
    data.config = CONFIG.WITCH_IRON;

    // Debug skills data
    console.log("WitchIronDescendantSheet | Skills data:", data.system.skills);

    // Add available data types for attributes
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items
    this._prepareItems(data);

    // Return data for rendering
    return data;
  }

  /**
   * Organize and classify items by type for easier rendering
   * @param {Object} sheetData The sheet data to add classified items to
   * @private
   */
  _prepareItems(sheetData) {
    // Initialize containers
    const injuries = [];
    const weapons = [];
    const armor = [];
    const gear = [];
    const consumables = [];
    const artifacts = [];
    const mutations = [];
    const madness = [];

    // Iterate through items, allocating them to appropriate categories
    for (let i of sheetData.actor.items) {
      let item = i;
      
      // Item's encumbrance might need to be displayed
      item.system.encumbrance = item.system.encumbrance || { value: 0 };
      
      // Classify items by type
      if (i.type === 'injury') injuries.push(item);
      else if (i.type === 'weapon') weapons.push(item);
      else if (i.type === 'armor') armor.push(item);
      else if (i.type === 'gear') gear.push(item);
      else if (i.type === 'consumable') consumables.push(item);
      else if (i.type === 'artifact') artifacts.push(item);
      else if (i.type === 'mutation') mutations.push(item);
      else if (i.type === 'madness') madness.push(item);
    }

    // Assign items to sheet data for rendering
    sheetData.injuries = injuries;
    sheetData.weapons = weapons;
    sheetData.armor = armor;
    sheetData.gear = gear;
    sheetData.consumables = consumables;
    sheetData.artifacts = artifacts;
    sheetData.mutations = mutations;
    sheetData.madness = madness;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Roll Attributes
    html.find('.attribute-circle').click(this._onRollAttribute.bind(this));

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
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Roll Skills by clicking on skill name
    html.find('.roll-skill').click(this._onRollSkill.bind(this));

    // Roll Specializations
    html.find('.roll-specialization').click(this._onRollSpecialization.bind(this));

    // Manage Specializations
    html.find('.skill-specialization-button').click(this._onManageSpecializations.bind(this));

    // Toggle specializations visibility when clicking on skill name
    html.find('.skill-name').click(ev => {
      const skillItem = $(ev.currentTarget).closest('.skill-item');
      const skillName = skillItem.data('skill');
      const specializations = skillItem.next('.skill-specializations');
      specializations.toggleClass('visible');
    });
    
    // Attribute circle value interactions
    this._setupAttributeCircles(html);
    
    // Handle attribute input changes
    html.find('.attribute-circle input').change(this._onAttributeChange.bind(this));

    // Log skills data for debugging
    console.log("Skills data in activateListeners:", this.actor.system.skills);
  }
  
  /**
   * Position the attribute sidebar to align with the tabs
   * @param {jQuery} html The sheet HTML
   * @private
   */
  _positionAttributeSidebar(html) {
    // This method is now a no-op since we're using flexbox layout
    // The sidebar is positioned via CSS in the sheet-content flexrow
  }
  
  /** @override */
  close() {
    // Clean up event listeners - keep this for safety
    $(window).off('resize.witch-iron-sheet');
    return super.close();
  }
  
  /**
   * Setup attribute circles with proper value display and interactions
   * @param {jQuery} html The rendered sheet HTML
   * @private 
   */
  _setupAttributeCircles(html) {
    // For each attribute circle, add data-digits attribute and click handler
    html.find('.attribute-circle').each((i, el) => {
      const circle = $(el);
      const valueDisplay = circle.find('.attribute-value');
      const input = circle.find('input');
      const attribute = circle.data('attribute');
      
      // Set the data-digits attribute based on the value length
      const value = input.val();
      const digits = String(value).length;
      valueDisplay.attr('data-digits', digits);
      
      // Adjust font size for values with more than 2 digits
      if (digits > 2) {
        const fontSize = Math.max(15, 26 - ((digits - 2) * 3)); // Increase base font size for larger circles
        valueDisplay.css('font-size', `${fontSize}px`);
      }
      
      // Get the attribute name and first letter for the label and bonus
      const attributeMap = {
        muscle: "Muscle",
        robustness: "Robustness",
        agility: "Agility",
        quickness: "Quickness",
        finesse: "Finesse",
        intellect: "Intellect",
        willpower: "Willpower",
        personality: "Personality",
        luck: "Luck"
      };
      const fullAttributeName = attributeMap[attribute] || attribute;
      const attributeFirstLetter = fullAttributeName.charAt(0);
      
      // Calculate bonus
      const bonus = Math.floor(value / 10);
      
      // Update the bonus display with the XB format (e.g., MB 5 for Muscle Bonus 5)
      const bonusDisplay = circle.find('.attribute-bonus');
      bonusDisplay.text(`${attributeFirstLetter}B ${bonus}`);
      
      // Add the attribute label with the full name
      const labelDisplay = circle.find('.attribute-label');
      labelDisplay.text(fullAttributeName);
      
      // Add a cog icon for editing
      if (!circle.find('.attribute-edit').length) {
        const editButton = $(`<div class="attribute-edit"><i class="fas fa-cog"></i></div>`);
        circle.append(editButton);
        
        // Set up the edit button click
        editButton.click(ev => {
          ev.stopPropagation(); // Prevent circle click
          this._showAttributeEditPopup(circle, input, value, fullAttributeName, html);
        });
      }
      
      // Set up the click on the circle to roll the attribute
      circle.off('click').on('click', ev => {
        // Roll the attribute
        if (this.actor.rollAttribute) {
          this.actor.rollAttribute(attribute);
        }
      });
    });
  }
  
  /**
   * Show a popup for editing an attribute value
   * @param {jQuery} circle The attribute circle element
   * @param {jQuery} input The hidden input field
   * @param {string} currentValue The current value
   * @param {string} attributeName The full attribute name
   * @param {jQuery} html The sheet HTML
   * @private
   */
  _showAttributeEditPopup(circle, input, currentValue, attributeName, html) {
    // Create a popup input for attribute editing
    const popupSize = 120;
    const rect = circle[0].getBoundingClientRect();
    const sheetRect = html.closest('.window-content')[0].getBoundingClientRect();
    
    const popupContainer = $(`<div class="attribute-popup"></div>`);
    const popupInput = $(`<input type="number" class="popup-attribute-input" value="${currentValue}">`);
    const popupLabel = $(`<div class="popup-attribute-label">${attributeName}</div>`);
    
    // Position the popup
    popupContainer.css({
      position: 'absolute',
      top: `${rect.top - sheetRect.top - (popupSize - rect.height) / 2}px`,
      left: `${rect.left - sheetRect.left + rect.width + 10}px`,
      width: `${popupSize + 30}px`, // Make wider to accommodate full attribute names
      height: `${popupSize - 10}px`
    });
    
    // Add popup to the form
    popupContainer.append(popupLabel).append(popupInput);
    html.closest('.window-content').append(popupContainer);
    
    // Focus input
    popupInput.focus().select();
    
    // Handle popup input blur
    popupInput.blur(function() {
      const newValue = parseInt($(this).val()) || 0;
      input.val(newValue).trigger('change');
      popupContainer.remove();
    });
    
    // Handle popup input enter key
    popupInput.keydown(function(e) {
      if (e.key === 'Enter') {
        $(this).blur();
      } else if (e.key === 'Escape') {
        popupContainer.remove();
      }
    });
    
    // Close popup when clicking outside
    $(document).on('mousedown.attribute-popup', function(e) {
      if (!$(e.target).closest(popupContainer).length) {
        popupContainer.remove();
        $(document).off('mousedown.attribute-popup');
      }
    });
  }
  
  /**
   * Handle attribute value changes
   * @param {Event} event   The triggering event
   * @private
   */
  _onAttributeChange(event) {
    const input = $(event.currentTarget);
    const circle = input.closest('.attribute-circle');
    const valueDisplay = circle.find('.attribute-value');
    const attribute = circle.data('attribute');
    
    // Update the displayed value
    const value = parseInt(input.val()) || 0;
    const digits = String(value).length;
    
    // Update the value display
    if (value < 10) {
      valueDisplay.text(`0${value}`);
    } else {
      valueDisplay.text(value);
    }
    
    // Set data-digits attribute
    valueDisplay.attr('data-digits', digits);
    
    // Adjust font size for values with more than 2 digits
    if (digits > 2) {
      const fontSize = Math.max(15, 26 - ((digits - 2) * 3)); // Increased base size for larger circles
      valueDisplay.css('font-size', `${fontSize}px`);
    } else {
      valueDisplay.css('font-size', '');
    }
    
    // Get the attribute first letter for the bonus
    const attributeMap = {
      muscle: "Muscle",
      robustness: "Robustness",
      agility: "Agility",
      quickness: "Quickness",
      finesse: "Finesse",
      intellect: "Intellect",
      willpower: "Willpower",
      personality: "Personality",
      luck: "Luck"
    };
    const fullAttributeName = attributeMap[attribute] || attribute;
    const attributeFirstLetter = fullAttributeName.charAt(0);
    
    // Update the bonus display with the XB format (e.g., MB 5 for Muscle Bonus 5)
    const bonus = Math.floor(value / 10);
    circle.find('.attribute-bonus').text(`${attributeFirstLetter}B ${bonus}`);
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type || "gear";
    await createItem(this.actor, type);
  }

  /**
   * Handle attribute rolls
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollAttribute(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const attribute = element.dataset.attribute;
    // Call the actor's rollAttribute method if it exists
    if (this.actor.rollAttribute) {
      this.actor.rollAttribute(attribute);
    }
  }

  /**
   * Handle skill rolls
   * @param {Event} event The originating click event
   * @private
   */
  _onRollSkill(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillName = element.dataset.skill;
    
    this.actor.rollSkill(skillName);
  }

  /**
   * Handle clicking the specialization button
   * @param {Event} event   The originating click event
   * @private
   */
  _onManageSpecializations(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const skillName = button.dataset.skill;
    const category = button.dataset.category;
    
    // Close any existing specialization dialog
    if (WitchIronDescendantSheet.activeSpecDialog) {
      WitchIronDescendantSheet.activeSpecDialog.close();
    }
    
    // Create a function to render the dialog with current data
    const renderSpecializationDialog = () => {
      // Find the skill in the actor data
      const skill = this.actor.system.skills[category][skillName];
      const specializations = skill.specializations || [];
      
      const dialog = new Dialog({
        title: `Manage Specializations for ${skill.label || skillName}`,
        content: `
          <form>
            <div class="form-group">
              <label>Specialization Name:</label>
              <input type="text" name="spec-name" value="" placeholder="Enter specialization name">
            </div>
            <div class="form-group">
              <label>Bonus Rating:</label>
              <input type="number" name="spec-rating" value="1" min="1" max="5">
            </div>
            <hr>
            <div class="existing-specializations">
              <h3>Existing Specializations</h3>
              ${specializations.length === 0 ? '<p>No specializations yet.</p>' : ''}
              ${specializations.map((spec, index) => `
                <div class="specialization-row flexrow" data-index="${index}">
                  <div class="specialization-name">${spec.name}</div>
                  <div class="specialization-rating">
                    <input type="number" name="edit-rating-${index}" value="${spec.rating}" min="1" max="5" class="edit-spec-rating" data-index="${index}">
                  </div>
                  <button type="button" class="delete-specialization" data-index="${index}">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </form>
        `,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: "Add Specialization",
            callback: html => {
              const form = html.find('form')[0];
              const specName = form.elements['spec-name'].value;
              const specRating = parseInt(form.elements['spec-rating'].value);
              
              if (!specName) return ui.notifications.error("Please enter a specialization name.");
              if (isNaN(specRating) || specRating < 1) return ui.notifications.error("Please enter a valid rating (1-5).");
              
              // Add the new specialization
              const path = `system.skills.${category}.${skillName}.specializations`;
              const currentSpecs = foundry.utils.getProperty(this.actor, path) || [];
              const newSpecs = currentSpecs.concat([{
                name: specName,
                rating: specRating
              }]);
              
              this.actor.update({[path]: newSpecs}).then(() => {
                // Close the current dialog and open a new one with updated data
                if (WitchIronDescendantSheet.activeSpecDialog) {
                  WitchIronDescendantSheet.activeSpecDialog.close();
                  WitchIronDescendantSheet.activeSpecDialog = null;
                }
                // Slight delay to ensure proper closure
                setTimeout(() => {
                  renderSpecializationDialog();
                }, 50);
              });
              return false; // Don't close the dialog
            }
          },
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
          }
        },
        default: "add",
        render: html => {
          // Add event listeners for delete buttons
          html.find('.delete-specialization').click(ev => {
            const index = ev.currentTarget.dataset.index;
            const path = `system.skills.${category}.${skillName}.specializations`;
            const currentSpecs = foundry.utils.getProperty(this.actor, path) || [];
            
            // Remove the specialization at the specified index
            currentSpecs.splice(index, 1);
            
            this.actor.update({[path]: currentSpecs}).then(() => {
              // Close the current dialog and open a new one with updated data
              if (WitchIronDescendantSheet.activeSpecDialog) {
                WitchIronDescendantSheet.activeSpecDialog.close();
                WitchIronDescendantSheet.activeSpecDialog = null;
              }
              // Slight delay to ensure proper closure
              setTimeout(() => {
                renderSpecializationDialog();
              }, 50);
            });
          });
          
          // Add event listeners for rating changes
          html.find('.edit-spec-rating').change(ev => {
            const index = ev.currentTarget.dataset.index;
            const newRating = parseInt(ev.currentTarget.value);
            
            if (isNaN(newRating) || newRating < 1 || newRating > 5) {
              return ui.notifications.error("Rating must be between 1 and 5.");
            }
            
            const path = `system.skills.${category}.${skillName}.specializations`;
            const currentSpecs = foundry.utils.getProperty(this.actor, path) || [];
            
            // Update the rating at the specified index
            if (currentSpecs[index]) {
              currentSpecs[index].rating = newRating;
              this.actor.update({[path]: currentSpecs});
            }
          });
        },
        close: () => {
          // Clear the active dialog reference
          WitchIronDescendantSheet.activeSpecDialog = null;
          // Refresh the character sheet when dialog closes
          this.render(true);
        }
      });
      
      // Store the dialog reference
      WitchIronDescendantSheet.activeSpecDialog = dialog;
      dialog.render(true);
    };
    
    // Initial render
    renderSpecializationDialog();
  }
  
  /**
   * Handle rolling a skill specialization
   * @param {Event} event The originating click event
   * @private
   */
  _onRollSpecialization(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillName = element.dataset.skill;
    const rating = parseInt(element.dataset.rating) || 1;
    
    this.actor.rollSkill(skillName, { additionalHits: rating });
  }

  /**
   * Handle resetting skills structure
   * @param {Event} event   The originating click event
   * @private
   */
  async _onResetSkills(event) {
    event.preventDefault();
    console.log("Resetting skills structure");
    
    // Show a loading/progress notification
    ui.notifications.info("Initializing skills structure...");
    
    // Create a new skills object based on CONFIG.WITCH_IRON.skills
    const newSkills = {};
    
    // Build new skills data structure
    for (const [categoryKey, categorySkills] of Object.entries(CONFIG.WITCH_IRON.skills)) {
      newSkills[categoryKey] = {};
      
      for (const [skillKey, skillData] of Object.entries(categorySkills)) {
        newSkills[categoryKey][skillKey] = {
          value: 0,
          ability: skillData.ability,
          label: skillData.label,
          specializations: []
        };
      }
    }
    
    // Update the actor
    try {
      await this.actor.update({"system.skills": newSkills});
      console.log("Skills reset complete:", newSkills);
      
      // Remove debug info after successful reset
      setTimeout(() => {
        this.element.find('.debug-info').fadeOut(500);
      }, 2000);
      
      // Show success notification
      ui.notifications.success("Skills structure initialized successfully!");
      
      // Re-render the sheet
      this.render(true);
    } catch (error) {
      console.error("Error resetting skills:", error);
      ui.notifications.error("Failed to initialize skills structure. See console for details.");
    }
  }
} 