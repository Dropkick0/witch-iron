// Import document classes
import { WitchIronActor } from "./module/documents.mjs";
import { WitchIronItem } from "./module/documents.mjs";

// Import data models
import { 
  CharacterDataModel,
  EnemyDataModel,
  WeaponDataModel,
  SpellDataModel,
  ArtifactDataModel,
  AlchemicalDataModel
} from "./module/data-models.mjs";

// Import settings module
import { registerSettings, rollSideInitiative } from "./module/settings.mjs";

// Import combat module
import { 
  initiateCombatQuarrel, 
  promptDefenseSkill, 
  initiateAttack 
} from "./module/combat-quarrels.mjs";

/**
 * Perform a Witch Iron percentile roll
 * This function handles the core roll-under d100 mechanic with critical success/fumble detection
 * 
 * @param {number} target - Target percentage to roll under
 * @param {number} modifier - Modifier to the roll
 * @param {string} description - Description of the roll
 * @param {object} options - Additional options for the roll
 * @returns {Promise<Roll>} - The completed roll
 */
async function witchIronRoll(target, modifier = 0, description = "", options = {}) {
  const rollFormula = "1d100";
  const roll = new Roll(rollFormula);
  await roll.evaluate({async: true});
  
  // Get the raw roll result
  const rawResult = roll.total;
  
  // Calculate the modified target value
  const modifiedTarget = target + modifier;
  
  // Determine success or failure
  const isSuccess = rawResult <= modifiedTarget;
  
  // Check for critical success conditions:
  // 1. Roll is 01-05, or
  // 2. Roll is a double-digit (11, 22, 33, etc.) on a successful check
  const tensDigit = Math.floor(rawResult / 10);
  const onesDigit = rawResult % 10;
  const isDouble = tensDigit === onesDigit;
  const isCriticalSuccess = isSuccess && (rawResult <= 5 || isDouble);
  
  // Check for fumble conditions:
  // 1. Roll is 96-00 (96-100), or
  // 2. Roll is a double-digit on a failed check
  const isFumble = !isSuccess && (rawResult >= 96 || isDouble);
  
  // Calculate hits based on the rules and roll outcome
  let hits = 0;
  let normalHits = 0;
  
  if (isSuccess) {
    // On normal success: hits equal the tens digit of the roll
    normalHits = tensDigit;
    
    if (isCriticalSuccess) {
      // On critical success: use +6 Hits or +1 total Hit (whichever is greater)
      hits = Math.max(6, normalHits + 1);
    } else {
      hits = normalHits;
    }
  } else {
    // On normal failure: negative hits equal the difference between ability's tens digit and roll's tens digit
    const abilityTensDigit = Math.floor(modifiedTarget / 10);
    normalHits = abilityTensDigit - tensDigit;
    
    // Make hits negative to indicate failure
    if (normalHits > 0) normalHits = -normalHits;
    
    if (isFumble) {
      // On fumble: always -6 Hits
      hits = -6;
    } else {
      hits = normalHits;
    }
  }
  
  // Apply status effects on fumble if configured
  if (isFumble && options.applyFumbleEffects !== false) {
    // If target actor is available, apply prone condition
    if (options.actor) {
      // Apply the prone condition
      game.witchIron.applyCondition(options.actor, "prone").then(effect => {
        if (effect) {
          console.log(`Witch Iron | Applied prone condition to ${options.actor.name} due to fumble`);
        }
      });
    }
  }
  
  // Construct the roll message
  let content = `
    <div class="witch-iron roll-result">
      <div class="roll-header">
        <h3>${description || "Witch Iron Roll"}</h3>
        <div class="roll-formula">Target: ${target}${modifier !== 0 ? ` (${modifier > 0 ? '+' : ''}${modifier})` : ''} = ${modifiedTarget}</div>
      </div>
      <div class="roll-outcome ${isSuccess ? 'success' : 'failure'} ${isCriticalSuccess ? 'critical-success' : ''} ${isFumble ? 'fumble' : ''}">
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${rollFormula}</div>
            <div class="dice-tooltip">
              <div class="dice">
                <ol class="dice-rolls">
                  <li class="roll die d100">${rawResult}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <div class="roll-status">
          ${isCriticalSuccess ? game.i18n.localize("WITCHIRON.Messages.criticalSuccess") : 
            isFumble ? game.i18n.localize("WITCHIRON.Messages.rollFumble") : 
            isSuccess ? game.i18n.localize("WITCHIRON.Messages.rollSuccess") : 
            game.i18n.localize("WITCHIRON.Messages.rollFailure")}
        </div>
        <div class="roll-hits">
          ${isSuccess ? 
            game.i18n.format("WITCHIRON.Messages.successWithHits", [`<span class="hits-value">${hits}</span>`]) + 
            (isCriticalSuccess && normalHits < 6 ? ' <span class="critical-bonus">(boosted to 6)</span>' : '') : 
            game.i18n.format("WITCHIRON.Messages.failureWithHits", [`<span class="hits-value">${hits}</span>`]) + 
            (isFumble && normalHits > -6 ? ' <span class="fumble-penalty">(reduced to -6)</span>' : '')}
        </div>
      </div>
    </div>
  `;
  
  // Create the chat message
  if (options.createMessage !== false) {
    await ChatMessage.create({
      content: content,
      speaker: options.speaker || ChatMessage.getSpeaker(),
      flavor: description,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll,
      sound: isCriticalSuccess ? "sounds/dice-critical.wav" : 
             isFumble ? "sounds/dice-fumble.wav" : null,
      flags: {
        "witch-iron": {
          rollData: {
            hits,
            rawResult,
            isSuccess,
            isCriticalSuccess,
            isFumble,
            target,
            modifiedTarget,
            tensDigit,
            onesDigit
          }
        }
      }
    });
  }
  
  // Return an object with all the roll information
  return {
    roll,
    rawResult,
    isSuccess,
    isCriticalSuccess,
    isFumble,
    hits,
    normalHits,
    target,
    modifiedTarget,
    content
  };
}

/**
 * Apply a condition to an actor
 * @param {Actor} actor - The actor to apply the condition to
 * @param {string} conditionId - The ID of the condition to apply
 * @returns {Promise<ActiveEffect|null>} - The created effect or null if failed
 */
async function applyCondition(actor, conditionId) {
  if (!actor || !conditionId) return null;
  
  // Get the condition data
  const condition = CONFIG.WITCHIRON.conditions[conditionId];
  if (!condition) return null;
  
  // Check if the actor already has this condition
  const existingEffect = actor.effects?.find(e => e.getFlag("witch-iron", "conditionId") === conditionId);
  if (existingEffect) return existingEffect;
  
  // Create the effect data
  const effectData = {
    label: condition.label,
    icon: condition.icon,
    origin: `Witch Iron: ${condition.label}`,
    duration: {
      rounds: null,
      seconds: null,
      startTime: game.time.worldTime
    },
    flags: {
      "witch-iron": {
        conditionId
      }
    }
  };
  
  // Add changes if defined
  if (condition.changes) {
    effectData.changes = condition.changes;
  }
  
  // Create the effect
  const effect = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  
  // Notify in chat if created successfully
  if (effect && effect.length > 0) {
    ChatMessage.create({
      content: `${actor.name} ${game.i18n.localize(`WITCHIRON.Messages.${conditionId}`)}!`,
      speaker: ChatMessage.getSpeaker({actor}),
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
    return effect[0];
  }
  
  return null;
}

/**
 * Get roll data from a chat message
 * 
 * @param {ChatMessage} message - The chat message to get roll data from
 * @returns {object|null} - The roll data or null if not found
 */
function getRollDataFromMessage(message) {
  return message?.flags?.["witch-iron"]?.rollData || null;
}

/**
 * Determine if an opposed roll succeeds
 * 
 * @param {object} activeRollData - The roll data for the active roll
 * @param {object} passiveRollData - The roll data for the passive/opposing roll
 * @returns {object} - Success info and net hits
 */
function resolveOpposedRoll(activeRollData, passiveRollData) {
  // If active roll failed, it automatically loses
  if (!activeRollData.isSuccess) {
    return {
      success: false,
      netHits: 0,
      margin: passiveRollData.isSuccess ? passiveRollData.hits : 0
    };
  }
  
  // If active roll succeeded but passive failed, active automatically wins
  if (activeRollData.isSuccess && !passiveRollData.isSuccess) {
    return {
      success: true,
      netHits: activeRollData.hits,
      margin: activeRollData.hits
    };
  }
  
  // Both succeeded, compare hits
  const netHits = activeRollData.hits - passiveRollData.hits;
  return {
    success: netHits >= 0,
    netHits: Math.abs(netHits),
    margin: netHits
  };
}

/**
 * Create an opposed roll between two actors
 * 
 * @param {WitchIronActor} activeActor - The actor making the active roll
 * @param {string} activeAbilityOrSkill - The ability or skill being rolled by the active actor
 * @param {WitchIronActor} passiveActor - The actor making the passive/opposing roll
 * @param {string} passiveAbilityOrSkill - The ability or skill being rolled by the passive actor
 * @param {object} options - Additional options for the roll
 * @returns {Promise<object>} - The result of the opposed roll
 */
async function createOpposedRoll(activeActor, activeAbilityOrSkill, passiveActor, passiveAbilityOrSkill, options = {}) {
  const isActiveSkill = activeActor.system.skills[activeAbilityOrSkill] !== undefined;
  const isPassiveSkill = passiveActor.system.skills[passiveAbilityOrSkill] !== undefined;
  
  // Get active roll
  let activeRoll;
  if (isActiveSkill) {
    activeRoll = await activeActor.rollSkill(activeAbilityOrSkill, null, {
      createMessage: false
    });
  } else {
    activeRoll = await activeActor.rollAbility(activeAbilityOrSkill, {
      createMessage: false
    });
  }
  
  // Get passive roll
  let passiveRoll;
  if (isPassiveSkill) {
    passiveRoll = await passiveActor.rollSkill(passiveAbilityOrSkill, null, {
      createMessage: false
    });
  } else {
    passiveRoll = await passiveActor.rollAbility(passiveAbilityOrSkill, {
      createMessage: false
    });
  }
  
  // Combine the rolls and determine the result
  const result = resolveOpposedRoll(activeRoll, passiveRoll);
  
  // Get proper ability/skill names for display
  const getDisplayName = (actor, abilityOrSkill, isSkill) => {
    if (isSkill) {
      return game.i18n.localize(`WITCHIRON.Skill.${abilityOrSkill}`);
    } else {
      return game.i18n.localize(`WITCHIRON.Ability.${abilityOrSkill}`);
    }
  };
  
  const activeDisplayName = getDisplayName(activeActor, activeAbilityOrSkill, isActiveSkill);
  const passiveDisplayName = getDisplayName(passiveActor, passiveAbilityOrSkill, isPassiveSkill);
  
  // Build a description
  const description = options.description || 
    `${activeActor.name}'s ${activeDisplayName} vs ${passiveActor.name}'s ${passiveDisplayName}`;
  
  // Create the roll message content
  let content = `
    <div class="witch-iron roll-result">
      <div class="roll-header">
        <h3>${description}</h3>
      </div>
      <div class="roll-outcome">
        <div class="active-roll">
          <div class="roll-formula">${activeActor.name}: ${activeDisplayName} (${activeRoll.target}${activeRoll.modifiedTarget !== activeRoll.target ? ` → ${activeRoll.modifiedTarget}` : ''})</div>
          <div class="dice-result">
            <span class="dice-total">${activeRoll.rawResult}</span>
            <span class="roll-status ${activeRoll.isSuccess ? 'success' : 'failure'}">
              ${activeRoll.isSuccess ? game.i18n.localize("WITCHIRON.Messages.rollSuccess") : game.i18n.localize("WITCHIRON.Messages.rollFailure")}
            </span>
            <span class="roll-hits">
              ${activeRoll.isSuccess ? 
                game.i18n.format("WITCHIRON.Messages.successWithHits", [`<span class="hits-value">${activeRoll.hits}</span>`]) : 
                game.i18n.format("WITCHIRON.Messages.failureWithHits", [`<span class="hits-value">${activeRoll.hits}</span>`])}
            </span>
          </div>
        </div>
        
        <div class="passive-roll">
          <div class="roll-formula">${passiveActor.name}: ${passiveDisplayName} (${passiveRoll.target}${passiveRoll.modifiedTarget !== passiveRoll.target ? ` → ${passiveRoll.modifiedTarget}` : ''})</div>
          <div class="dice-result">
            <span class="dice-total">${passiveRoll.rawResult}</span>
            <span class="roll-status ${passiveRoll.isSuccess ? 'success' : 'failure'}">
              ${passiveRoll.isSuccess ? game.i18n.localize("WITCHIRON.Messages.rollSuccess") : game.i18n.localize("WITCHIRON.Messages.rollFailure")}
            </span>
            <span class="roll-hits">
              ${passiveRoll.isSuccess ? 
                game.i18n.format("WITCHIRON.Messages.successWithHits", [`<span class="hits-value">${passiveRoll.hits}</span>`]) : 
                game.i18n.format("WITCHIRON.Messages.failureWithHits", [`<span class="hits-value">${passiveRoll.hits}</span>`])}
            </span>
          </div>
        </div>
        
        <div class="opposed-roll">
          <div class="opposed-roll-header">Result:</div>
          <div class="opposed-result ${result.success ? 'opposed-success' : 'opposed-failure'}">
            ${result.success ? 
              `${activeActor.name} succeeds!` : 
              `${passiveActor.name} prevails!`}
          </div>
          <div class="net-hits">
            ${result.netHits > 0 ? 
              `With ${result.netHits} net hit${result.netHits > 1 ? 's' : ''}` : 
              'Exact tie'}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create a chat message
  if (options.createMessage !== false) {
    const chatData = {
      content: content,
      speaker: ChatMessage.getSpeaker({actor: activeActor}),
      flavor: description,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      flags: {
        "witch-iron": {
          opposedRoll: {
            activeRoll: activeRoll.roll.toJSON(),
            passiveRoll: passiveRoll.roll.toJSON(),
            activeRollData: {
              actorId: activeActor.id,
              abilityOrSkill: activeAbilityOrSkill,
              isSkill: isActiveSkill,
              ...activeRoll
            },
            passiveRollData: {
              actorId: passiveActor.id,
              abilityOrSkill: passiveAbilityOrSkill,
              isSkill: isPassiveSkill,
              ...passiveRoll
            },
            result
          }
        }
      }
    };
    
    await ChatMessage.create(chatData);
  }
  
  // Return the complete result data
  return {
    activeRoll,
    passiveRoll,
    result,
    content
  };
}

// Initialize system
Hooks.once("init", () => {
  console.log("Witch Iron | Initializing the Witch Iron Game System");
  
  // Register system settings
  registerSettings();
  
  // Define custom constants for Witch Iron
  CONFIG.WITCHIRON = {
    // Lineages
    startingLineages: [
      "academic", "alchemist", "black-thumb", "pit-born", "ordained", "shadow", "witch", "workhorse"
    ],
    unlockableLineages: [
      "anchorite", "arcanist", "beast", "berserker", "blood", "crusader", "curseling", 
      "demon", "dreadnaught", "druid", "flesh-sculptor", "inquisitor", "musician", 
      "noble", "occultist", "red-hand", "revenant", "rune-carver", "veteran", "warden", "wind-forged"
    ],
    // Damage types
    damageTypes: [
      "physical", "fire", "cold", "lightning", "arcane", "necrotic"
    ],
    // Body locations for injuries
    bodyLocations: [
      "head", "torso", "right arm", "left arm", "right leg", "left leg"
    ],
    // Conditions
    conditions: {
      prone: {
        label: "Prone",
        description: "Character is lying on the ground. -20% to all physical actions. Must spend half movement to stand up.",
        icon: "icons/svg/falling.svg",
        changes: [
          {
            key: "system.encumbranceModifier",
            mode: 2, // add
            value: -20
          }
        ]
      }
    }
  };
  
  // Make the witchIronRoll function available globally
  game.witchIron = {
    witchIronRoll,
    applyCondition,
    getRollDataFromMessage,
    resolveOpposedRoll,
    createOpposedRoll,
    rollSideInitiative,
    // Add combat quarrel functions
    initiateCombatQuarrel,
    promptDefenseSkill,
    initiateAttack
  };
  
  // Configure custom Document implementations
  CONFIG.Actor.documentClass = WitchIronActor;
  CONFIG.Item.documentClass = WitchIronItem;
  
  // Configure system data models
  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    enemy: EnemyDataModel
  };
  
  CONFIG.Item.dataModels = {
    weapon: WeaponDataModel,
    spell: SpellDataModel,
    artifact: ArtifactDataModel,
    alchemical: AlchemicalDataModel
  };
  
  // Configure trackable attributes (for token bars)
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["corruption.value", "stress.value", "abilities.luck.current"],
      value: ["secondary.attacks"]
    },
    enemy: {
      bar: ["corruption.value"],
      value: ["secondary.attacks"]
    }
  };
  
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);
  
  // The sheet registration will be handled in documents.mjs
  
  // Register system settings
  game.settings.register("witch-iron", "enabledLineages", {
    name: "Enabled Lineages",
    hint: "The lineages that have been unlocked through play",
    scope: "world",
    config: false,
    type: Array,
    default: CONFIG.WITCHIRON.startingLineages
  });
  
  game.settings.register("witch-iron", "useDetailedInjuries", {
    name: "Use Detailed Injuries",
    hint: "Enable the detailed injury tracking system",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  
  game.settings.register("witch-iron", "enableCorruptionSystem", {
    name: "Enable Corruption System",
    hint: "Enable the corruption and mutation system",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  
  game.settings.register("witch-iron", "enableStressSystem", {
    name: "Enable Stress System",
    hint: "Enable the stress and madness system",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  
  // Register handlebars helpers
  Handlebars.registerHelper('witchIronAbilityBonus', function(value) {
    return Math.floor(value / 10);
  });
  
  Handlebars.registerHelper('witchIronAvailableLineages', function(options) {
    const enabledLineages = game.settings.get("witch-iron", "enabledLineages");
    return options.fn({lineages: enabledLineages});
  });
});

// Wait for game ready
Hooks.once("ready", async function() {
  // This code will run once the game is ready
  console.log("Witch Iron | Ready");
});

// Add custom roll handling to chat
Hooks.on("renderChatMessage", (message, html, data) => {
  // Get roll data if present
  const rollData = getRollDataFromMessage(message);
  
  // Add click handlers for button rolls in chat
  html.on("click", ".roll-button", event => {
    event.preventDefault();
    const button = event.currentTarget;
    const abilityName = button.dataset.ability;
    const actorId = button.dataset.actorId;
    
    if (actorId && abilityName) {
      const actor = game.actors.get(actorId);
      if (actor) {
        actor.rollAbility(abilityName);
      }
    }
  });
  
  // Add handler for clicking on roll results to initiate opposed rolls
  if (rollData) {
    html.find('.roll-outcome').addClass('clickable');
    
    // Display a tooltip when hovering over a roll result
    html.find('.roll-outcome').attr('title', 'Click to make an opposed roll');
    
    // When clicking on a roll, show a dialog to create an opposed roll
    html.find('.roll-outcome').on('click', async event => {
      event.preventDefault();
      
      // Get the actor who made the roll
      let actor;
      if (message.speaker.actor) {
        actor = game.actors.get(message.speaker.actor);
      }
      
      if (!actor) {
        return ui.notifications.warn("Could not find actor for the roll");
      }
      
      // Create a list of potential opponents - all other actors owned by players
      const opponents = game.actors.filter(a => a.id !== actor.id && a.isOwner);
      
      if (!opponents.length) {
        return ui.notifications.warn("No available opponents found");
      }
      
      // Create a dialog to select an opponent and ability/skill
      let opposedRollHtml = `
        <form>
          <div class="form-group">
            <label>Opponent:</label>
            <select name="opponent">
              ${opponents.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Using Ability/Skill:</label>
            <select name="ability-skill">
              <optgroup label="Abilities">
                ${Object.entries(CONFIG.WITCHIRON.abilities).map(([id, label]) => 
                  `<option value="ability-${id}">${label}</option>`).join('')}
              </optgroup>
              <optgroup label="Skills">
                ${Object.entries(CONFIG.WITCHIRON.skills).map(([id, label]) => 
                  `<option value="skill-${id}">${label}</option>`).join('')}
              </optgroup>
            </select>
          </div>
        </form>
      `;
      
      new Dialog({
        title: "Create Opposed Roll",
        content: opposedRollHtml,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice"></i>',
            label: "Roll",
            callback: html => {
              const form = html.find('form')[0];
              const opponentId = form.elements['opponent'].value;
              const abilitySkill = form.elements['ability-skill'].value;
              
              // Parse the ability/skill selection
              const [type, name] = abilitySkill.split('-');
              const isSkill = type === 'skill';
              
              // Get the opponent actor
              const opponent = game.actors.get(opponentId);
              if (!opponent) return;
              
              // Determine which ability or skill was used in the original roll
              const originalRoll = message.flags['witch-iron']?.rollData;
              
              // Extract the skill or ability name - needs to be fixed
              let originalAbilityOrSkill = '';
              
              // If we have rollData but no specific ability/skill info, try to determine it from the original roll
              if (originalRoll) {
                // Try to figure out which ability or skill was used based on the message content
                const messageContent = message.content;
                
                // Look for skills first (more specific)
                for (const [key, label] of Object.entries(CONFIG.WITCHIRON.skills)) {
                  if (messageContent.includes(label)) {
                    originalAbilityOrSkill = key;
                    break;
                  }
                }
                
                // If no skill found, check abilities
                if (!originalAbilityOrSkill) {
                  for (const [key, label] of Object.entries(CONFIG.WITCHIRON.abilities)) {
                    if (messageContent.includes(label)) {
                      originalAbilityOrSkill = key;
                      break;
                    }
                  }
                }
                
                // Default to muscle if still not found
                originalAbilityOrSkill = originalAbilityOrSkill || 'muscle';
              }
              
              // Create the opposed roll
              actor.rollOpposed(
                originalAbilityOrSkill,
                opponent,
                name
              );
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "roll"
      }).render(true);
    });
  }
});

// Combat initiative hooks
Hooks.on("createCombat", async (combat) => {
  // Don't do anything if side initiative is not enabled
  if (!game.settings.get("witch-iron", "useSideInitiative")) return;
  
  // Roll initiative for the combat
  if (game.user.isGM) {
    const message = await rollSideInitiative(combat);
    
    // Create a chat message to announce the initiative result
    ChatMessage.create({
      content: message,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      speaker: ChatMessage.getSpeaker({alias: game.i18n.localize("WITCHIRON.Combat.RollForInitiative")})
    });
  }
});

// Override the default initiative formula when our system is in use
Hooks.on("preUpdateCombat", (combat, updateData) => {
  // Don't do anything if side initiative is not enabled
  if (!game.settings.get("witch-iron", "useSideInitiative")) return;
  
  // If we're rolling initiative, prevent the default roll
  if (updateData.round === 1 && combat.round === 0) {
    // Prevent the default initiative roll by removing the flag
    if (updateData.flags?.core?.initiativeRoll) {
      delete updateData.flags.core.initiativeRoll;
    }
  }
});

// Make sure auto-roll initiative doesn't work when using our system
Hooks.on("combatant.rollInitiative", (combatant) => {
  if (game.settings.get("witch-iron", "useSideInitiative")) {
    return false; // Prevent the default behavior
  }
}); 