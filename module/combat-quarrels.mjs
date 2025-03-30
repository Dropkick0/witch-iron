/**
 * Combat Quarrels system for Witch Iron
 * Handles opposed skill checks for attack and defense actions
 */

/**
 * Initiates a combat quarrel between attacker and defender
 * 
 * @param {WitchIronActor} attacker - The actor making the attack
 * @param {string} attackSkill - The skill being used for the attack (melee, ranged)
 * @param {WitchIronActor} defender - The actor defending against the attack
 * @param {string|null} defenseSkill - Optional specific defense skill to use
 * @param {object} options - Additional options
 * @returns {Promise<object>} - The result of the quarrel
 */
export async function initiateCombatQuarrel(attacker, attackSkill, defender, defenseSkill = null, options = {}) {
  const isRanged = attackSkill === "ranged";
  
  // If no defense skill is specified, determine the appropriate default
  if (!defenseSkill) {
    if (isRanged) {
      // Ranged attacks can only be defended with Light-Foot
      defenseSkill = "lightFoot";
    } else {
      // For melee, we'll default to Melee but this can be changed by the defender
      defenseSkill = "melee";
    }
  }
  
  // Prepare options
  const quarrelOptions = {
    createMessage: false,
    ...options,
    description: options.description || 
      `${attacker.name}'s ${game.i18n.localize(`WITCHIRON.Skill.${attackSkill}`)} attack vs ${defender.name}`
  };
  
  // Perform the opposed roll
  const opposedRoll = await game.witchIron.createOpposedRoll(
    attacker, 
    attackSkill, 
    defender, 
    defenseSkill, 
    quarrelOptions
  );
  
  // Extract result details
  const { activeRoll, passiveRoll, result } = opposedRoll;
  
  // Determine who gets injured based on the quarrel outcome and attack type
  let attackerInjured = false;
  let defenderInjured = false;
  
  if (result.success) {
    // Attacker succeeded - defender is injured
    defenderInjured = true;
  } else if (!isRanged && defenseSkill === "melee") {
    // In melee combat where defender used Melee and won, attacker is injured
    attackerInjured = true;
  }
  
  // Determine hit location based on the ones digit of the attack roll
  const hitLocationDigit = activeRoll.rawResult % 10;
  const hitLocation = determineHitLocation(hitLocationDigit);
  
  // Create a proper chat message to report the outcome
  let content = await createQuarrelChatMessage(
    attacker, attackSkill, defender, defenseSkill, 
    activeRoll, passiveRoll, result, 
    attackerInjured, defenderInjured,
    hitLocation
  );
  
  // Create the chat message
  await ChatMessage.create({
    content: content,
    speaker: ChatMessage.getSpeaker({actor: attacker}),
    flavor: quarrelOptions.description,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    flags: {
      "witch-iron": {
        quarrel: {
          attackerId: attacker.id,
          attackSkill,
          defenderId: defender.id,
          defenseSkill,
          result,
          attackerInjured,
          defenderInjured,
          hitLocation,
          hitLocationDigit,
          netHits: result.netHits
        }
      }
    }
  });
  
  return {
    ...opposedRoll,
    attackerInjured,
    defenderInjured,
    hitLocation
  };
}

/**
 * Determines hit location based on digit
 * 
 * @param {number} digit - The ones digit from the attack roll (0-9)
 * @returns {string} - Body location
 */
function determineHitLocation(digit) {
  const locations = [
    "head",      // 0
    "torso",     // 1
    "torso",     // 2
    "torso",     // 3
    "rightArm",  // 4
    "leftArm",   // 5
    "rightArm",  // 6
    "leftArm",   // 7
    "rightLeg",  // 8
    "leftLeg"    // 9
  ];
  
  return locations[digit];
}

/**
 * Creates a chat message for a combat quarrel result
 * 
 * @param {WitchIronActor} attacker - The attacking actor
 * @param {string} attackSkill - The attack skill used
 * @param {WitchIronActor} defender - The defending actor
 * @param {string} defenseSkill - The defense skill used
 * @param {object} attackRoll - The attacker's roll result
 * @param {object} defenseRoll - The defender's roll result
 * @param {object} result - The result of the opposed roll
 * @param {boolean} attackerInjured - Whether the attacker was injured
 * @param {boolean} defenderInjured - Whether the defender was injured
 * @param {string} hitLocation - The location of the hit
 * @returns {Promise<string>} - HTML content for the chat message
 */
async function createQuarrelChatMessage(
  attacker, attackSkill, defender, defenseSkill, 
  attackRoll, defenseRoll, result, 
  attackerInjured, defenderInjured,
  hitLocation
) {
  const attackSkillName = game.i18n.localize(`WITCHIRON.Skill.${attackSkill}`);
  const defenseSkillName = game.i18n.localize(`WITCHIRON.Skill.${defenseSkill}`);
  const hitLocationName = game.i18n.localize(`WITCHIRON.BodyLocations.${hitLocation}`);
  
  // Construct the message based on the outcome
  let outcomeText = "";
  let outcomeClass = "";
  
  if (result.success) {
    // Attacker wins
    outcomeText = `${attacker.name}'s attack succeeds`;
    outcomeClass = "success";
    
    if (result.netHits > 0) {
      outcomeText += ` with +${result.netHits} Net Hit${result.netHits > 1 ? 's' : ''}`;
    } else {
      outcomeText += ` (exact tie)`;
    }
    
    if (defenderInjured) {
      outcomeText += ` - ${defender.name} is injured in the ${hitLocationName}!`;
    }
  } else {
    // Defender wins
    outcomeText = `${attacker.name}'s attack fails`;
    outcomeClass = "failure";
    
    if (result.netHits > 0) {
      outcomeText += ` by ${result.netHits} Net Hit${result.netHits > 1 ? 's' : ''}`;
    }
    
    if (attackerInjured) {
      outcomeText += ` - ${defender.name} counters and ${attacker.name} is injured in the ${hitLocationName}!`;
    } else {
      outcomeText += ` - ${defender.name} successfully defends!`;
    }
  }
  
  // Include critical success/fumble text if applicable
  let criticalText = "";
  
  if (attackRoll.isCriticalSuccess) {
    criticalText += `<div class="critical-success-note">${attacker.name} scores a critical hit!</div>`;
  } else if (attackRoll.isFumble) {
    criticalText += `<div class="fumble-note">${attacker.name} fumbles the attack!</div>`;
  }
  
  if (defenseRoll.isCriticalSuccess) {
    criticalText += `<div class="critical-success-note">${defender.name} performs a perfect defense!</div>`;
  } else if (defenseRoll.isFumble) {
    criticalText += `<div class="fumble-note">${defender.name} fumbles the defense!</div>`;
  }
  
  // Generate the HTML content
  return `
    <div class="witch-iron quarrel-result">
      <div class="quarrel-header">
        <h3>Combat Quarrel</h3>
      </div>
      <div class="quarrel-rolls">
        <div class="attack-roll">
          <div class="roll-label">${attacker.name}'s ${attackSkillName}</div>
          <div class="roll-result ${attackRoll.isSuccess ? 'success' : 'failure'} ${attackRoll.isCriticalSuccess ? 'critical' : ''} ${attackRoll.isFumble ? 'fumble' : ''}">
            <span class="dice-value">${attackRoll.rawResult}</span> vs <span class="target-value">${attackRoll.modifiedTarget}</span> 
            (<span class="hit-value">Hits: ${attackRoll.hits}</span>)
          </div>
        </div>
        
        <div class="defense-roll">
          <div class="roll-label">${defender.name}'s ${defenseSkillName}</div>
          <div class="roll-result ${defenseRoll.isSuccess ? 'success' : 'failure'} ${defenseRoll.isCriticalSuccess ? 'critical' : ''} ${defenseRoll.isFumble ? 'fumble' : ''}">
            <span class="dice-value">${defenseRoll.rawResult}</span> vs <span class="target-value">${defenseRoll.modifiedTarget}</span> 
            (<span class="hit-value">Hits: ${defenseRoll.hits}</span>)
          </div>
        </div>
      </div>
      
      ${criticalText}
      
      <div class="quarrel-outcome ${outcomeClass}">
        <span class="outcome-text">${outcomeText}</span>
      </div>
      
      <div class="hit-location">
        <span class="hit-location-label">Hit Location: </span>
        <span class="hit-location-value">${hitLocationName}</span>
        <span class="hit-location-digit">(Roll: ${attackRoll.rawResult}, Digit: ${attackRoll.rawResult % 10})</span>
      </div>
      
      <div class="quarrel-actions">
        ${defenderInjured ? 
          `<button class="apply-injury" data-actor-id="${defender.id}" data-location="${hitLocation}" data-net-hits="${result.netHits}">
            Apply Injury to ${defender.name}
           </button>` : ''}
        ${attackerInjured ? 
          `<button class="apply-injury" data-actor-id="${attacker.id}" data-location="${hitLocation}" data-net-hits="${result.netHits}">
            Apply Injury to ${attacker.name}
           </button>` : ''}
        ${defenderInjured && result.netHits >= 2 ? 
          `<button class="change-location" data-injured-id="${defender.id}">
            Spend 2 Hits to Change Location
           </button>` : ''}
      </div>
    </div>
  `;
}

/**
 * Prompt the defender to choose a defense skill
 * 
 * @param {WitchIronActor} defender - The defending actor
 * @param {boolean} isRanged - Whether the attack is ranged
 * @returns {Promise<string>} - The chosen defense skill
 */
export async function promptDefenseSkill(defender, isRanged) {
  // For ranged attacks, only Light-Foot can be used
  if (isRanged) {
    return "lightFoot";
  }
  
  // For NPCs, use a default defense based on their skills
  if (defender.type === "enemy" || !game.user.isGM && !defender.isOwner) {
    // Check if the NPC has Light-Foot skill
    if (defender.system.skills.lightFoot && defender.system.skills.lightFoot.value >= 10) {
      return "lightFoot";
    }
    // Default to Melee for NPCs
    return "melee";
  }
  
  // For player characters, show a dialog to choose
  return new Promise((resolve) => {
    new Dialog({
      title: "Choose Defense",
      content: `
        <form>
          <div class="form-group">
            <label>How will ${defender.name} defend?</label>
            <select name="defense-skill">
              <option value="melee">Melee (Parry/Block)</option>
              <option value="lightFoot">Light-Foot (Dodge)</option>
            </select>
          </div>
        </form>
      `,
      buttons: {
        defend: {
          icon: '<i class="fas fa-shield-alt"></i>',
          label: "Defend",
          callback: html => {
            const form = html.find('form')[0];
            const defenseSkill = form.elements['defense-skill'].value;
            resolve(defenseSkill);
          }
        }
      },
      default: "defend",
      close: () => resolve("melee") // Default to melee if dialog is closed
    }).render(true);
  });
}

/**
 * Initiate an attack from a character
 * This is the main function to be called when an attack is made
 * 
 * @param {WitchIronActor} attacker - The attacking actor
 * @param {string} attackSkill - The skill used to attack (melee or ranged)
 * @returns {Promise<void>}
 */
export async function initiateAttack(attacker, attackSkill) {
  // Get targeted tokens
  const targets = game.user.targets;
  
  if (targets.size === 0) {
    ui.notifications.warn("You must target a token to attack!");
    return;
  }
  
  if (targets.size > 1) {
    ui.notifications.warn("Please target only one token to attack!");
    return;
  }
  
  // Get the defender from the targeted token
  const targetToken = targets.first();
  const defender = targetToken.actor;
  
  if (!defender) {
    ui.notifications.warn("Invalid target!");
    return;
  }
  
  // Prompt for defense skill based on attack type
  const isRanged = attackSkill === "ranged";
  const defenseSkill = await promptDefenseSkill(defender, isRanged);
  
  // Execute the combat quarrel
  await initiateCombatQuarrel(attacker, attackSkill, defender, defenseSkill);
}

// Register listeners for applying injury via chat message
Hooks.on("renderChatMessage", (message, html, data) => {
  // Check if this is a quarrel message
  const quarrelData = message.flags?.["witch-iron"]?.quarrel;
  if (!quarrelData) return;
  
  // Add click handler for the "Apply Injury" buttons
  html.find(".apply-injury").click(async (event) => {
    const actorId = event.currentTarget.dataset.actorId;
    const location = event.currentTarget.dataset.location;
    const netHits = parseInt(event.currentTarget.dataset.netHits) || 1;
    const actor = game.actors.get(actorId);
    
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
      ui.notifications.warn("You don't have permission to modify that actor!");
      return;
    }
    
    // Launch the injury application dialog
    applyInjury(actor, location, netHits);
  });
  
  // Add click handler for changing hit location
  html.find(".change-location").click(async (event) => {
    const injuredId = event.currentTarget.dataset.injuredId;
    const actor = game.actors.get(injuredId);
    
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
      ui.notifications.warn("You don't have permission to modify that actor!");
      return;
    }
    
    promptHitLocationChange(message.id, actor);
  });
});

/**
 * Open a dialog to change the hit location
 * 
 * @param {string} messageId - ID of the chat message
 * @param {WitchIronActor} actor - The actor to change hit location for
 */
async function promptHitLocationChange(messageId, actor) {
  const message = game.messages.get(messageId);
  const quarrelData = message.flags?.["witch-iron"]?.quarrel;
  
  if (!quarrelData) return;
  
  new Dialog({
    title: `Change Hit Location (Spending 2 Hits)`,
    content: `
      <form>
        <div class="form-group">
          <label>New Hit Location:</label>
          <select name="location">
            <option value="head">Head</option>
            <option value="torso">Torso</option>
            <option value="rightArm">Right Arm</option>
            <option value="leftArm">Left Arm</option>
            <option value="rightLeg">Right Leg</option>
            <option value="leftLeg">Left Leg</option>
          </select>
        </div>
      </form>
      <p>This will spend 2 Hits from the attacker's total.</p>
    `,
    buttons: {
      confirm: {
        icon: '<i class="fas fa-check"></i>',
        label: "Confirm",
        callback: async html => {
          const form = html.find('form')[0];
          const newLocation = form.elements.location.value;
          
          // Update the message content to reflect the new hit location
          const content = message.content;
          
          // Create a temporary element to parse the HTML
          const tempElement = document.createElement('div');
          tempElement.innerHTML = content;
          
          // Update hit location display
          const hitLocationElement = tempElement.querySelector('.hit-location-value');
          if (hitLocationElement) {
            hitLocationElement.textContent = game.i18n.localize(`WITCHIRON.BodyLocations.${newLocation}`);
          }
          
          // Update the "Apply Injury" button's data attribute
          const injuryButton = tempElement.querySelector('.apply-injury');
          if (injuryButton) {
            injuryButton.dataset.location = newLocation;
          }
          
          // Remove the "Change Location" button since it's been used
          const changeButton = tempElement.querySelector('.change-location');
          if (changeButton) {
            changeButton.remove();
          }
          
          // Add a note about the location change
          const noteDiv = document.createElement('div');
          noteDiv.className = 'location-change-note';
          noteDiv.textContent = `${actor.name} spent 2 Hits to change hit location to ${game.i18n.localize(`WITCHIRON.BodyLocations.${newLocation}`)}`;
          tempElement.querySelector('.quarrel-outcome').insertAdjacentElement('afterend', noteDiv);
          
          // Update the message in the database
          await message.update({
            content: tempElement.innerHTML,
            flags: {
              "witch-iron": {
                quarrel: {
                  ...quarrelData,
                  hitLocation: newLocation,
                  locationChanged: true
                }
              }
            }
          });
          
          // Post a follow-up chat message about the change
          await ChatMessage.create({
            content: `${actor.name} spent 2 Hits to change the hit location to ${game.i18n.localize(`WITCHIRON.BodyLocations.${newLocation}`)}`,
            speaker: ChatMessage.getSpeaker({actor}),
            flavor: "Hit Location Changed",
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
          });
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "confirm"
  }).render(true);
}

/**
 * Open a dialog to apply an injury to an actor
 * 
 * @param {WitchIronActor} actor - The actor to apply injury to
 * @param {string} location - The body location of the injury
 * @param {number} netHits - The number of net hits (used to suggest severity)
 */
async function applyInjury(actor, location, netHits = 1) {
  // Suggest severity based on net hits, but minimum of 1
  const suggestedSeverity = Math.max(1, netHits);
  
  new Dialog({
    title: `Apply Injury to ${actor.name}`,
    content: `
      <form>
        <div class="form-group">
          <label>Body Location:</label>
          <select name="location">
            <option value="head" ${location === 'head' ? 'selected' : ''}>Head</option>
            <option value="torso" ${location === 'torso' ? 'selected' : ''}>Torso</option>
            <option value="rightArm" ${location === 'rightArm' ? 'selected' : ''}>Right Arm</option>
            <option value="leftArm" ${location === 'leftArm' ? 'selected' : ''}>Left Arm</option>
            <option value="rightLeg" ${location === 'rightLeg' ? 'selected' : ''}>Right Leg</option>
            <option value="leftLeg" ${location === 'leftLeg' ? 'selected' : ''}>Left Leg</option>
          </select>
        </div>
        <div class="form-group">
          <label>Injury Severity:</label>
          <input type="number" name="severity" value="${suggestedSeverity}" min="1" max="10">
          <p class="hint">Suggested based on Net Hits: ${suggestedSeverity}</p>
        </div>
        <div class="form-group">
          <label>Injury Description:</label>
          <input type="text" name="description" value="Combat Wound">
        </div>
      </form>
    `,
    buttons: {
      apply: {
        icon: '<i class="fas fa-bandage"></i>',
        label: "Apply Injury",
        callback: html => {
          const form = html.find('form')[0];
          const location = form.elements.location.value;
          const severity = parseInt(form.elements.severity.value);
          const description = form.elements.description.value;
          
          // Here you would call the actor method to apply the injury
          // This would need to be implemented in the Actor class
          if (actor.applyInjury) {
            actor.applyInjury(location, severity, description);
          } else {
            ui.notifications.info(`Applied ${description} (Severity ${severity}) to ${actor.name}'s ${game.i18n.localize(`WITCHIRON.BodyLocations.${location}`)}.`);
            
            // If the actor doesn't have the applyInjury method, we can create a simple effect
            createInjuryEffect(actor, location, severity, description);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "apply"
  }).render(true);
}

/**
 * Create an ActiveEffect to represent an injury
 * 
 * @param {WitchIronActor} actor - The actor to apply the effect to
 * @param {string} location - Body location
 * @param {number} severity - Injury severity
 * @param {string} description - Injury description
 */
async function createInjuryEffect(actor, location, severity, description) {
  // Define penalties based on location and severity
  let changes = [];
  
  // Basic penalties based on location
  switch(location) {
    case "head":
      changes.push({
        key: "system.abilities.intelligence.mod", 
        mode: 2, // ADD mode
        value: -severity
      });
      break;
    case "torso":
      changes.push({
        key: "system.abilities.constitution.mod", 
        mode: 2,
        value: -severity
      });
      break;
    case "rightArm":
    case "leftArm":
      changes.push({
        key: "system.skills.melee.value", 
        mode: 2,
        value: -severity * 2
      });
      break;
    case "rightLeg":
    case "leftLeg":
      changes.push({
        key: "system.skills.lightFoot.value", 
        mode: 2,
        value: -severity * 2
      });
      break;
  }
  
  // Create the effect
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    label: `${description} (${game.i18n.localize(`WITCHIRON.BodyLocations.${location}`)})`,
    icon: "icons/svg/blood.svg",
    origin: "Injury",
    duration: {
      rounds: null, // Permanent until treated
      seconds: null,
      startTime: game.time.worldTime
    },
    flags: {
      "witch-iron": {
        injury: {
          location,
          severity,
          description,
          treated: false,
          permanent: false
        }
      }
    },
    changes: changes
  }]);
  
  // Create a chat message about the injury
  ChatMessage.create({
    content: `${actor.name} suffers a ${severity > 3 ? 'serious' : 'minor'} injury to their ${game.i18n.localize(`WITCHIRON.BodyLocations.${location}`)}!`,
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: description,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
  });
} 