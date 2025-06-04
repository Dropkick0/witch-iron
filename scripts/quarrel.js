import { registerCommonHandlebarsHelpers } from "./handlebars-helpers.js";

/**
 * Quarrel system for Witch Iron
 * Implements contested checks with Net Hits results
 *
 * CONDITION QUARRELS
 * ------------------
 * - Any sourceCheckData containing a `condition` field triggers a custom, non-combat quarrel.
 * - Optional properties allow full customization:
 *     • customName:       String header title (e.g. "Aflame Quarrel")
 *     • customIcon:       URL for the chat header icon
 *     • skill:            Skill label (e.g. "Hardship" for conditions Aflame/Bleed/Poison or "Steel" for Stress/Corruption)
 *     • resultMessages:   { success, failure, cost } follow-up texts:
 *         – success: Message shown when the CONDITION wins (monster fails)
 *         – failure: Message shown when the monster overcomes the CONDITION (condition removed)
 *         – cost:    Message shown on a tie (no net wins)
 * - For Aflame/Bleed/Poison, all three condition values are summed as the Hardship check rating.
 * - For Stress/Corruption, the single condition value is used as the Steel check rating.
 *
 * Flow:
 *   1. onChatMessageCreated short-circuits if `pendingQuarrel.condition` exists, building a quarrelObj
 *      with isCombatCheck=false and all custom_* fields, then resolves immediately using hits from
 *      both the monster's normal roll (including derived +Hits) and the condition rating.
 *   2. resolveQuarrel detects `quarrel.condition` and force-sets isCombatCheck=false,
 *      preventing any monster/melee combat overrides.
 *   3. createQuarrelResultMessage hides combat badges/buttons for condition quarrels
 *      and renders the provided resultMessages based on the outcome.
 */

// Icon mapping for condition quarrels
const CONDITION_ICONS = {
  aflame: "icons/svg/fire.svg",
  bleed: "icons/svg/blood.svg",
  poison: "icons/svg/poison.svg",
  stress: "icons/svg/burst.svg",
  corruption: "icons/svg/bone.svg",
  blind: "icons/svg/eye.svg",
  deaf: "icons/svg/deaf.svg",
  pain: "icons/svg/daze.svg"
};

/**
 * Clear all physical affliction conditions on the actor
 * @param {Actor} actor - The actor to update
 */
async function clearPhysicalConditions(actor) {
  if (!actor) return;

  const updates = {
    'system.conditions.aflame.value': 0,
    'system.conditions.bleed.value': 0,
    'system.conditions.poison.value': 0
  };

  // Update the actor document
  await actor.update(updates);

  // Determine which tokens should receive the update
  const tokens = actor.isToken ? [actor.token] : actor.getActiveTokens(true);
  for (const token of tokens) {
    if (token?.actor) {
      await token.actor.update(updates);
      if (token.actor.sheet) {
        await token.actor.sheet.render(false);
      }
    }
  }

  // Refresh the actor's own sheet if it's open
  if (actor.sheet) {
    await actor.sheet.render(false);
  }
}

/**
 * Apply updates to an actor and all of its active tokens, then refresh sheets.
 * @param {Actor} actor - The actor to update
 * @param {Object} updates - The update data object
 */
async function updateActorAndTokens(actor, updates) {
  if (!actor) return;

  // Update the base actor
  await actor.update(updates);

  // Determine relevant tokens (unlinked tokens only update themselves)
  const tokens = actor.isToken ? [actor.token] : actor.getActiveTokens(true);
  for (const token of tokens) {
    if (token?.actor) {
      await token.actor.update(updates);
      if (token.actor.sheet) {
        await token.actor.sheet.render(false);
      }
    }
  }

  // Refresh the actor's own sheet if open
  if (actor.sheet) {
    await actor.sheet.render(false);
  }
}

/**
 * Force refresh of a specific condition display on any open sheets
 * @param {Actor} actor - The actor whose sheet should refresh
 * @param {string} condition - Condition key (stress, corruption, etc.)
 * @param {number} value - New numeric value to display
 */
function refreshConditionDisplay(actor, condition, value) {
  if (!actor) return;

  const updateHTML = (sheet) => {
    if (!sheet?.rendered) return;
    const html = sheet.element;
    const displayElement = html.find(`.condition-row[data-condition="${condition}"] .cond-value`);
    if (displayElement.length) {
      displayElement.text(value);
    }
  };

  updateHTML(actor.sheet);

  const tokens = actor.isToken ? [actor.token] : actor.getActiveTokens(true);
  for (const token of tokens) {
    updateHTML(token.actor?.sheet);
  }
}

class QuarrelTracker {
    constructor() {
        this.pendingQuarrels = new Map(); // Map of actor ID -> checkData
        this.pendingTokenQuarrels = new Map(); // Map of token ID -> checkData
        this.activeQuarrels = new Set(); // Track all actors currently involved in any quarrel
        this.selectedCheck = null;
        // Expose condition icons mapping on the instance for easy access
        this.CONDITION_ICONS = CONDITION_ICONS;
        console.log("Witch Iron | QuarrelTracker initialized");
    }
    
    /**
     * Register a check that can be used in a quarrel
     * @param {Object} checkData - Data about the check
     * @param {string} targetActorId - The actor ID of the target
     * @param {string} targetTokenId - The token ID of the target (optional)
     * @param {Object} additionalData - Additional data to store with the quarrel (optional)
     */
    registerPendingQuarrel(checkData, targetActorId, targetTokenId = null, additionalData = null) {
        console.log(`Witch Iron | Registering pending quarrel for ${getDisplayName(game.actors.get(targetActorId))}`);
        console.log(`Witch Iron | Check data:`, checkData);
        
        if (!targetActorId) {
            console.error("Witch Iron | Cannot register quarrel: Target actor ID is missing");
            return;
        }
        
        if (!checkData) {
            console.error("Witch Iron | Cannot register quarrel: Check data is missing");
            return;
        }
        
        // Also add the source actor to active quarrels so their next roll won't start a new one
        if (checkData.actorId) {
            this.activeQuarrels.add(checkData.actorId);
        }
        
        // If we have additional data, merge it with the check data
        if (additionalData) {
            checkData = { ...checkData, ...additionalData };
        }
        
        // Track by both actor ID and token ID (if available)
        this.pendingQuarrels.set(targetActorId, checkData);
        if (targetTokenId) {
            this.pendingTokenQuarrels.set(targetTokenId, checkData);
        }
        
        // If we have a quarrelId in additionalData, also store by that
        if (additionalData?.quarrelId) {
            this.pendingQuarrels.set(additionalData.quarrelId, {
                initiator: checkData,
                responder: additionalData.responderCheckData
            });
        }
        
        // Add target to active quarrels
        this.activeQuarrels.add(targetActorId);
        
        console.log(`Witch Iron | Quarrel registered. Total pending actor quarrels: ${this.pendingQuarrels.size}, token quarrels: ${this.pendingTokenQuarrels.size}`);
        this.logQuarrelState();
    }
    
    /**
     * Select a check to use in a quarrel
     * @param {Object} checkData - Data about the check
     */
    selectCheck(checkData) {
        console.log(`Witch Iron | Selecting check:`, checkData);
        
        if (!checkData) {
            console.error("Witch Iron | Cannot select check: Check data is missing");
            return;
        }
        
        // If there's already a selected check, replace it
        if (this.selectedCheck) {
            console.log(`Witch Iron | Replacing previously selected check from ${this.selectedCheck.actorName}`);
        }
        
        this.selectedCheck = checkData;
        
        // Add source to active quarrels
        if (checkData.actorId) {
            this.activeQuarrels.add(checkData.actorId);
        }
        
        // Create a notification for the user
        ui.notifications.info(`Quarrel: Selected ${checkData.actorName}'s check with ${checkData.hits} hits. Make your next roll to complete the quarrel.`);
        
        console.log(`Witch Iron | Check selected successfully`);
        this.logQuarrelState();
    }
    
    /**
     * Get a pending quarrel for a given actor or token
     * @param {string} targetActorId - The ID of the actor to check
     * @param {string} targetTokenId - The ID of the token to check (optional)
     * @returns {Object|null} The check data if found, null otherwise
     */
    getPendingQuarrelForActor(targetActorId, targetTokenId = null) {
        console.log(`Witch Iron | Checking for pending quarrel for actor ${targetActorId} / token ${targetTokenId}`);
        
        if (!targetActorId && !targetTokenId) {
            console.log("Witch Iron | Cannot check for quarrel: Both target actor ID and token ID are missing");
            return null;
        }
        
        let checkData = null;
        
        // First check by token ID if available (more specific)
        if (targetTokenId && this.pendingTokenQuarrels.has(targetTokenId)) {
            checkData = this.pendingTokenQuarrels.get(targetTokenId);
            console.log(`Witch Iron | Found pending quarrel for token ${targetTokenId}:`, checkData);
            return checkData;
        }
        
        // Then check by actor ID
        if (targetActorId && this.pendingQuarrels.has(targetActorId)) {
            checkData = this.pendingQuarrels.get(targetActorId);
            console.log(`Witch Iron | Found pending quarrel for actor ${targetActorId}:`, checkData);
            return checkData;
        }
        
        console.log(`Witch Iron | No pending quarrel found for actor ${targetActorId} or token ${targetTokenId}`);
        return null;
    }
    
    /**
     * Check if an actor is already involved in any active quarrel
     * @param {string} actorId - The ID of the actor to check
     * @returns {boolean} True if actor is in an active quarrel
     */
    isActorInActiveQuarrel(actorId) {
        return this.activeQuarrels.has(actorId);
    }
    
    /**
     * Clear a pending quarrel for a given actor and/or token
     * @param {string} targetActorId - The ID of the actor to clear
     * @param {string} targetTokenId - The ID of the token to clear (optional)
     */
    clearPendingQuarrel(targetActorId, targetTokenId = null) {
        console.log(`Witch Iron | Clearing pending quarrel for actor ${targetActorId} / token ${targetTokenId}`);
        
        if (!targetActorId && !targetTokenId) {
            console.log("Witch Iron | Cannot clear quarrel: Both target actor ID and token ID are missing");
            return;
        }
        
        // Remove from active quarrels
        if (targetActorId) {
            this.activeQuarrels.delete(targetActorId);
            this.pendingQuarrels.delete(targetActorId);
        }
        
        if (targetTokenId) {
            this.pendingTokenQuarrels.delete(targetTokenId);
        }
        
        console.log(`Witch Iron | Quarrel cleared. Total pending actor quarrels: ${this.pendingQuarrels.size}, token quarrels: ${this.pendingTokenQuarrels.size}`);
        this.logQuarrelState();
    }

    /**
     * Clear the selected check
     */
    clearSelectedCheck() {
        console.log("Witch Iron | Clearing selected check");
        this.selectedCheck = null;
        console.log("Witch Iron | Selected check cleared");
        this.logQuarrelState();
    }
    
    /**
     * Clear all pending quarrels for an actor
     * @param {string} actorId - The ID of the actor to clear
     */
    clearAllQuarrelsForActor(actorId) {
        console.log(`Witch Iron | Clearing all quarrels for actor ${actorId}`);
        
        if (!actorId) {
            console.log("Witch Iron | Cannot clear quarrels: Actor ID is missing");
            return;
        }
        
        // Remove from active quarrels
        this.activeQuarrels.delete(actorId);
        
        // Remove the direct actor ID entry
        this.pendingQuarrels.delete(actorId);
        
        // Also check pendingTokenQuarrels for any quarrels related to this actor
        for (const [tokenId, checkData] of this.pendingTokenQuarrels.entries()) {
            if (checkData.actorId === actorId) {
                this.pendingTokenQuarrels.delete(tokenId);
            }
        }
        
        // Also check ALL pendingQuarrels to find any that involve this actor as initiator or responder
        const quarrelsToDelete = [];
        for (const [quarrelId, quarrelData] of this.pendingQuarrels.entries()) {
            // Check if it's a structured quarrel object with initiator/responder
            if (quarrelData && typeof quarrelData === 'object') {
                if (quarrelData.initiator && quarrelData.initiator.actorId === actorId) {
                    console.log(`Witch Iron | Found quarrel ${quarrelId} with actor ${actorId} as initiator`);
                    quarrelsToDelete.push(quarrelId);
                } else if (quarrelData.responder && quarrelData.responder.actorId === actorId) {
                    console.log(`Witch Iron | Found quarrel ${quarrelId} with actor ${actorId} as responder`);
                    quarrelsToDelete.push(quarrelId);
                }
            }
        }
        
        // Delete all found quarrels
        for (const quarrelId of quarrelsToDelete) {
            console.log(`Witch Iron | Deleting quarrel ${quarrelId}`);
            this.pendingQuarrels.delete(quarrelId);
        }
        
        console.log(`Witch Iron | All quarrels cleared for actor ${actorId}. Deleted ${quarrelsToDelete.length} structured quarrels.`);
        this.logQuarrelState();
    }
    
    /**
     * Log the current state of the QuarrelTracker
     */
    logQuarrelState() {
        console.log("Witch Iron | Current QuarrelTracker state:");
        console.log(`  Selected check: ${this.selectedCheck ? JSON.stringify(this.selectedCheck) : "None"}`);
        console.log(`  Pending actor quarrels: ${this.pendingQuarrels.size}`);
        console.log(`  Pending token quarrels: ${this.pendingTokenQuarrels.size}`);
        console.log(`  Active quarrels (actor IDs): ${this.activeQuarrels.size}`);
        
        if (this.pendingQuarrels.size > 0) {
            console.log("  Pending actor quarrel details:");
            this.pendingQuarrels.forEach((checkData, actorId) => {
                const actor = game.actors.get(actorId);
                const actorName = actor ? getDisplayName(actor) : actorId;
                console.log(`    ${actorName}: ${JSON.stringify(checkData)}`);
            });
        }
        
        if (this.pendingTokenQuarrels.size > 0) {
            console.log("  Pending token quarrel details:");
            this.pendingTokenQuarrels.forEach((checkData, tokenId) => {
                const token = canvas.tokens.placeables.find(t => t.id === tokenId);
                const tokenName = token?.name || tokenId;
                console.log(`    ${tokenName}: ${JSON.stringify(checkData)}`);
            });
        }
    }

    async resolveQuarrel(quarrelId, rollMode = "roll") {
        // Get the quarrel data and debug log it
        const quarrel = this.pendingQuarrels.get(quarrelId);
        console.log("Witch Iron | resolveQuarrel received quarrel data:", quarrel);
        
        // Validate quarrel exists
        if (!quarrel) {
            console.error(`Quarrel ${quarrelId} not found`);
            ui.notifications.error("Quarrel not found");
            return null;
        }
        
        // Log quarrel data for debugging
        console.log(`Resolving quarrel ${quarrelId}:`, quarrel);
        
        // Get actor information, preferring token actors when available
        const initiatorToken = quarrel.initiator.tokenId ? canvas.tokens.get(quarrel.initiator.tokenId) : null;
        const responderToken = quarrel.responder.tokenId ? canvas.tokens.get(quarrel.responder.tokenId) : null;

        let initiatorActor = initiatorToken?.actor || game.actors.get(quarrel.initiator.actorId);
        let responderActor = responderToken?.actor || game.actors.get(quarrel.responder.actorId);
        
        // Validate both actors exist
        if (!initiatorActor || !responderActor) {
            console.error(`Actors not found: Initiator(${quarrel.initiator.actorId}) or Responder(${quarrel.responder.actorId})`);
            ui.notifications.error("Actors not found");
            this.pendingQuarrels.delete(quarrelId);
            return null;
        }
        
        // Log actor details for debugging
        console.log(`Quarrel actors - Initiator: ${initiatorActor.name} (${initiatorActor.type}), Responder: ${responderActor.name} (${responderActor.type})`);
        
        // Debug info for combat check flags
        this.debugActorCombatFlag(initiatorActor);
        this.debugActorCombatFlag(responderActor);

        // Use the existing hits instead of rolling new ability checks
        const initiatorHits = quarrel.initiator.hits || 0;
        const responderHits = quarrel.responder.hits || 0;
        const netHits = initiatorHits - responderHits;
        
        console.log(`Using existing hits - Initiator: ${initiatorHits}, Responder: ${responderHits}, Net: ${netHits}`);

        // If actor wins a relevant condition quarrel, clear all related physical conditions
        if (quarrel.condition && ['aflame', 'bleed', 'poison'].includes(quarrel.condition) && netHits < 0) {
            if (responderActor) {
                console.log(`Witch Iron | Actor ${responderActor.name} won against ${quarrel.condition}. Clearing Aflame, Bleed, and Poison conditions.`);
                await clearPhysicalConditions(responderActor);
                ui.notifications.info(`${responderActor.name} has overcome their physical afflictions!`);
            } else {
                console.warn(`Witch Iron | Condition quarrel won by responder, but responderActor is undefined. Cannot clear conditions.`);
            }
        }

        // --- FORCE NON-COMBAT FOR CONDITION QUARRELS ---
        // If `quarrel.condition` is set, treat this as a custom condition quarrel (non-combat).
        // This prevents any monster or melee overrides from re-classifying it as combat.
        // Determine if this is a combat check
        let isCombatCheck;
        if (quarrel.condition) {
            console.log(`Condition quarrel detected (condition: ${quarrel.condition}), forcing non-combat`);
            isCombatCheck = false;
        } else if (typeof quarrel.isCombatCheck === 'boolean') {
            // Use the explicit flag from the quarrel data
            isCombatCheck = quarrel.isCombatCheck;
        } else {
            // Default: use actor combat flags
            isCombatCheck = this.hasCombatCheckEnabled(initiatorActor) || this.hasCombatCheckEnabled(responderActor);
        }
        
        // Special handling for monster actors - if either actor is a monster and the message contains melee attack, 
        // force this to be a combat check
        const isMonsterQuarrel = initiatorActor.type === 'monster' || responderActor.type === 'monster';
        
        // Find the associated messages to check for melee attack
        let initiatorMessage = null;
        if (quarrel.initiator.messageId) {
            initiatorMessage = game.messages.get(quarrel.initiator.messageId);
        }
        
        let responderMessage = null;
        if (quarrel.responder.messageId) {
            responderMessage = game.messages.get(quarrel.responder.messageId);
        }
        
        // Check if any message contains melee attack
        const isAttackQuarrel = 
            (initiatorMessage && initiatorMessage.content && initiatorMessage.content.includes('Melee Attack')) ||
            (responderMessage && responderMessage.content && responderMessage.content.includes('Melee Attack'));
            
        // If this is a monster involved in a melee attack, it's definitely a combat check (unless it's a condition quarrel)
        if (!quarrel.condition && !isCombatCheck && isMonsterQuarrel && isAttackQuarrel) {
            console.log(`Monster quarrel with melee attack detected - forcing combat check flag to true`);
            isCombatCheck = true;
            
            // Update the combat check flags on the actors for future reference
            if (initiatorActor.type === 'monster' && initiatorActor.system?.flags) {
                console.log(`Setting combat check flag for initiator monster ${initiatorActor.name}`);
                
                // We can't use update() here because we need an immediate value change
                initiatorActor.system.flags.isCombatCheck = true;
                
                // Try to persist this change 
                try {
                    initiatorActor.update({'system.flags.isCombatCheck': true});
                    console.log(`Updated monster ${initiatorActor.name} with combat check flag`);
                } catch (err) {
                    console.warn(`Could not persist combat flag update: ${err.message}`);
                }
                return true;
            }
            
            if (responderActor.type === 'monster' && responderActor.system?.flags) {
                console.log(`Setting combat check flag for responder monster ${responderActor.name}`);
                
                // We can't use update() here because we need an immediate value change
                responderActor.system.flags.isCombatCheck = true;
                
                // Try to persist this change 
                try {
                    responderActor.update({'system.flags.isCombatCheck': true});
                    console.log(`Updated monster ${responderActor.name} with combat check flag`);
                } catch (err) {
                    console.warn(`Could not persist combat flag update: ${err.message}`);
                }
                return true;
            }
        }
        
        console.log(`Is combat check: ${isCombatCheck} (override: ${quarrel.isCombatCheck ?? 'none'}, standard: ${this.hasCombatCheckEnabled(initiatorActor) || this.hasCombatCheckEnabled(responderActor)}, monster override: ${isMonsterQuarrel && isAttackQuarrel})`);

        // Create the result object
        const result = {
            quarrelId,
            initiator: {
                actorId: quarrel.initiator.actorId,
                checkId: quarrel.initiator.checkId,
                roll: null  // No roll object, using hits directly
            },
            responder: {
                actorId: quarrel.responder.actorId,
                checkId: quarrel.responder.checkId,
                roll: null  // No roll object, using hits directly
            },
            netHits,
            isCombatCheck,
            // Add fields for template compatibility
            initiatorName: initiatorActor.name,
            responderName: responderActor.name,
            initiatorHits,
            responderHits,
            initiatorImg: getActorImage(initiatorActor),
            responderImg: getActorImage(responderActor)
        };
        
        // Attach custom quarrel parameters if provided
        result.condition = quarrel.condition || null;
        result.headerTitle = quarrel.customName || null;
        result.headerIcon = quarrel.customIcon || null;
        result.skill = quarrel.skill || null;
        result.resultMessages = quarrel.resultMessages || null;
        
        // --- CONDITION QUARREL RESULT FALLBACK ---
        // Ensure a condition quarrel result never shows combat UI: hide badges/buttons.
        // Safety: force non-combat display for condition quarrels
        if (quarrel.condition) {
            result.isCombatCheck = false;
            result.nonCombat = true;
        }

        // Determine outcome based on netHits
        if (netHits > 0) {
            result.outcome = "Victory";
            result.initiatorOutcome = "Victory";
            result.responderOutcome = "Defeat";
        } else if (netHits < 0) {
            result.outcome = "Defeat";
            result.initiatorOutcome = "Defeat";
            result.responderOutcome = "Victory";
        } else {
            result.outcome = "VictoryAtACost";
            result.initiatorOutcome = "VictoryAtACost";
            result.responderOutcome = "VictoryAtACost";
        }

        // Handle combat check and injury data
        if (isCombatCheck) {
            console.log("Processing combat check for injury data");
            
            // Determine attacker and defender based on who won the quarrel
            let attackerActor, defenderActor, attackerName, defenderName;
            let absoluteNetHits = Math.abs(netHits);
            
            if (netHits >= 0) {
                // Initiator is the attacker
                attackerActor = initiatorActor;
                defenderActor = responderActor;
                attackerName = initiatorActor.name;
                defenderName = responderActor.name;
            } else {
                // Responder is the attacker
                attackerActor = responderActor;
                defenderActor = initiatorActor;
                attackerName = responderActor.name;
                defenderName = initiatorActor.name;
            }
            
            // Get weapon damage and soak values
            const weaponDmg = attackerActor.system?.derived?.damageValue || 1;
            const soak = defenderActor.system?.derived?.soakValue || 0;
            
            // Calculate net damage
            const netDamage = Math.max(0, weaponDmg + absoluteNetHits - soak);
            console.log(`Combat damage calculation: ${weaponDmg} (weapon) + ${absoluteNetHits} (hits) - ${soak} (soak) = ${netDamage}`);
            
            // Roll for hit location
            const locationRoll = new Roll("1d10");
            await locationRoll.evaluate();
            const hitLocationRoll = locationRoll.total;
            
            console.log(`Hit location roll: ${hitLocationRoll}`);
            
            // Generate injury data if there's any damage
            if (netDamage > 0) {
                // Use the determineInjury function to get the injury data
                const injury = determineInjury(hitLocationRoll, netDamage);
                
                if (injury) {
                    result.injuryData = {
                        ...injury,
                        attacker: attackerName,
                        defender: defenderName,
                        weaponDmg,
                        soak,
                        netHits: absoluteNetHits,
                        netDamage
                    };
                    
                    console.log("Generated injury data:", result.injuryData);
                }
            } else {
                console.log("No damage dealt - no injury generated");
            }
        }

        // Remove the quarrel from the pending list
        this.pendingQuarrels.delete(quarrelId);
        
        // --- APPLY CONDITION QUARREL EFFECTS ---
        if (result.condition) {
            const actor = initiatorActor;
            // Character 'dies' if condition wins (initiatorOutcome is 'Victory'); mark token as dead
            if (result.initiatorOutcome === 'Victory') {
                canvas.tokens.placeables
                  .filter(t => t.actor?.id === actor.id)
                  .forEach(t => t.actor?.toggleStatusEffect("dead", {active: true, overlay: true}));

                // Additional effects for Stress and Corruption
                if (['stress','corruption'].includes(result.condition)) {
                    const wpPath = 'system.attributes.willpower.value';
                    const currentWP = foundry.utils.getProperty(responderActor, wpPath) || 0;
                    const updateData = {
                        [wpPath]: Math.max(currentWP - 10, 0),
                        [`system.conditions.${result.condition}.value`]: 0
                    };
                    await updateActorAndTokens(responderActor, updateData);
                    refreshConditionDisplay(responderActor, result.condition, 0);
                }
            }
            // Remove all conditions if actor wins
            else if (result.responderOutcome === 'Victory') {
                if (['aflame','bleed','poison'].includes(result.condition)) {
                    await clearPhysicalConditions(responderActor);
                } else if (!['stress','corruption'].includes(result.condition)) {
                    const updateData = { [`system.conditions.${result.condition}.value`]: 0 };
                    await updateActorAndTokens(responderActor, updateData);
                }
            }
            // Tie (VictoryAtACost) -> no automatic changes
        }
        // Create the chat message
        await createQuarrelResultMessage(result);

        return result;
    }

    /**
     * Debug the combat flag for an actor
     * @param {Actor} actor - The actor to check
     */
    debugActorCombatFlag(actor) {
        if (!actor) {
            console.log(`Witch Iron | DEBUG Combat Flag: Actor is null or undefined`);
            return;
        }
        
        // Log basic info
        console.log(`Witch Iron | DEBUG Combat Flag - Actor: ${actor.name} (${actor.id}), Type: ${actor.type}`);
        
        try {
            // Check raw data
            if (actor.system) {
                console.log(`Witch Iron | DEBUG Raw actor.system flags:`, actor.system.flags);
                if (actor.system.flags) {
                    console.log(`Witch Iron | DEBUG isCombatCheck in system.flags:`, actor.system.flags.isCombatCheck);
                } else {
                    console.log(`Witch Iron | DEBUG system.flags is undefined`);
                }
            } else {
                console.log(`Witch Iron | DEBUG actor.system is undefined`);
            }
            
            // Check actor flags
            if (actor.flags) {
                if (actor.flags["witch-iron"]) {
                    console.log(`Witch Iron | DEBUG actor.flags.witch-iron:`, actor.flags["witch-iron"]);
                }
            } else {
                console.log(`Witch Iron | DEBUG actor.flags is undefined`);
            }
            
            // Final diagnosis
            const hasCombatCheck = this.hasCombatCheckEnabled(actor);
            console.log(`Witch Iron | DEBUG Final diagnosis: hasCombatCheckEnabled = ${hasCombatCheck}`);
        } catch (error) {
            console.error(`Witch Iron | ERROR in debugActorCombatFlag:`, error);
        }
    }

    /**
     * Check if an actor has combat check enabled
     * @param {Actor} actor - The actor to check
     * @returns {boolean} Whether the actor has combat check enabled
     */
    hasCombatCheckEnabled(actor) {
        if (!actor) {
            console.warn("hasCombatCheckEnabled called with null actor");
            return false;
        }

        // Add debugging log for complete actor data
        console.log(`Checking combat flag for actor ${actor.name} (${actor.id}), type: ${actor.type}`);
        
        // Initialize system.flags if not present
        if (actor.system && !actor.system.flags) {
            console.log(`Initializing missing system.flags for actor ${actor.name}`);
            actor.system.flags = {};
        }
        
        // Check in various locations and log the result
        const inActorFlags = actor.flags?.["witch-iron"]?.isCombatCheck || false;
        const inSystemFlags = actor.system?.flags?.isCombatCheck || false;
        const inSystemRoot = actor.system?.isCombatCheck || false;
        
        console.log(`Combat check flags for ${actor.name}: actor.flags=${inActorFlags}, system.flags=${inSystemFlags}, system.root=${inSystemRoot}`);
        
        // If flag is found in any location, return true
        if (inActorFlags || inSystemFlags || inSystemRoot) {
            console.log(`Combat check flag found for actor ${actor.name}`);
            return true;
        }
        
        // Special logic for monsters - all monster attacks should be combat checks
        if (actor.type === 'monster') {
            console.log(`Actor ${actor.name} is a monster - should be a combat check by default`);
            
            // Set the flag if we can
            if (actor.system && actor.system.flags) {
                console.log(`Auto-enabling combat check for monster ${actor.name}`);
                
                // We can't use update() here because we need an immediate value change
                actor.system.flags.isCombatCheck = true;
                
                // Try to persist this change 
                try {
                    actor.update({'system.flags.isCombatCheck': true});
                    console.log(`Updated monster ${actor.name} with combat check flag`);
                } catch (err) {
                    console.warn(`Could not persist combat flag update: ${err.message}`);
                }
                return true;
            }
        }
        
        // If no flag found but actor has a weapon, automatically enable combat check
        const hasWeapon = actor.items?.some(item => 
            item.type === "weapon" || 
            (item.type === "ability" && item.system?.tags?.includes("weapon"))
        );
        
        if (hasWeapon) {
            console.log(`No combat flag found, but actor ${actor.name} has a weapon - enabling combat`);
            // Set the flag in system.flags
            if (actor.system && actor.system.flags) {
                actor.system.flags.isCombatCheck = true;
                // Try to persist this change
                try {
                    actor.update({'system.flags.isCombatCheck': true});
                } catch (err) {
                    console.warn(`Could not persist combat flag update: ${err.message}`);
                }
                return true;
            }
        }
        
        // No flag found and no weapons
        console.log(`No combat flag or weapons found for actor ${actor.name}`);
        return false;
    }
}

// Attach the condition icons mapping to the QuarrelTracker class
QuarrelTracker.CONDITION_ICONS = CONDITION_ICONS;

// Create a singleton instance
const quarrelTracker = new QuarrelTracker();

/**
 * Initialize the Quarrel system
 */
export function initQuarrel() {
    console.log("Witch Iron | Initializing Quarrel system");
    
    // Initialize handlebars helpers
    initQuarrelHandlebarHelpers();
    
    // Register Handlebars helper for math operations
    Handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);
        
        switch(operator) {
            case '+': return lvalue + rvalue;
            case '-': return lvalue - rvalue;
            case '*': return lvalue * rvalue;
            case '/': return lvalue / rvalue;
            case '%': return lvalue % rvalue;
            default: return lvalue;
        }
    });
    
    // Register hooks to handle quarrels
    Hooks.on("createChatMessage", onChatMessageCreated);
    
    // Add context menu option to chat messages
    Hooks.on("renderChatMessage", (message, html) => {
        // Add quarrel context menu and prepare data
        addQuarrelContextOption(message, html);
        
        // Add event handlers for quarrel result buttons
        const quarrelResult = html.find('.witch-iron-quarrel-result');
        if (quarrelResult.length) {
            // Toggle combat results
            html.find('.toggle-combat-results').click(evt => {
                const button = evt.currentTarget;
                const shows = button.dataset.shows === 'true';
                const results = html.find('.combat-results');
                
                if (shows) {
                    results.slideUp(200);
                    button.dataset.shows = 'false';
                    button.innerHTML = '<i class="fas fa-chevron-down"></i> ' + 
                        game.i18n.localize("WITCHIRON.ToggleCombatResults");
                } else {
                    results.slideDown(200);
                    button.dataset.shows = 'true';
                    button.innerHTML = '<i class="fas fa-chevron-up"></i> ' + 
                        game.i18n.localize("WITCHIRON.ToggleCombatResults");
                }
            });
            
            // Toggle injury results
            html.find('.toggle-injury-results').click(evt => {
                const button = evt.currentTarget;
                const shows = button.dataset.shows === 'true';
                const injuryTable = html.find('.injury-table');
                
                if (shows) {
                    injuryTable.slideUp(200);
                    button.dataset.shows = 'false';
                    button.innerHTML = '<i class="fas fa-chevron-down"></i> ' + 
                        game.i18n.localize("WITCHIRON.ToggleInjuryResults");
                } else {
                    injuryTable.slideDown(200);
                    button.dataset.shows = 'true';
                    button.innerHTML = '<i class="fas fa-chevron-up"></i> ' + 
                        game.i18n.localize("WITCHIRON.ToggleInjuryResults");
                }
            });
            
            // Create injury
            html.find('.create-injury').click(onCreateInjuryClick);

            // Roll modification buttons
            html.find('.reverse-btn').click(ev => handleReverseClick(ev));
            html.find('.reroll-btn').click(ev => handleRerollClick(ev));
            html.find('.luck-btn').click(ev => handleLuckClick(ev));
        }
        
        // Legacy flip button for old template
        const flipButton = html.find('.flip-hits-btn');
        if (flipButton.length) {
            flipButton.on('click', (event) => {
                event.preventDefault();
                const card = $(event.currentTarget).closest('.quarrel-card, .witch-iron.chat-card.quarrel-result');
                
                console.log("Witch Iron | Flip button clicked");
                
                // Get all visible and hidden net hits
                const visibleHits = card.find('.net-hits-display');
                const hiddenHits = card.find('.hidden-net-hits .net-hits');
                
                // Store which character's hits are currently visible
                const visibleCharacter = visibleHits.length ? visibleHits.attr('data-character') : null;
                
                if (hiddenHits.length) {
                    // Move currently visible hits to hidden container
                    if (visibleHits.length) {
                        card.find('.hidden-net-hits').append(visibleHits.detach());
                    }
                    
                    // Find the other character's hits
                    const hitsToShow = hiddenHits.filter((i, el) => $(el).attr('data-character') !== visibleCharacter);
                    
                    // Move to visible location
                    if (hitsToShow.length) {
                        const character = hitsToShow.attr('data-character');
                        if (character === 'initiator') {
                            card.find('.initiator').append(hitsToShow.detach());
                        } else {
                            card.find('.responder').append(hitsToShow.detach());
                        }
                        
                        // Update display class
                        hitsToShow.addClass('net-hits-display');
                    }
                }
                
                // Animate the flip button
                $(event.currentTarget).addClass('rotating');
                setTimeout(() => $(event.currentTarget).removeClass('rotating'), 500);
            });
        }
        
        // Add event listeners for the combat result and injury toggles
        const combatToggleButton = html.find('.toggle-combat-result');
        if (combatToggleButton.length) {
            combatToggleButton.on('click', (event) => {
                event.preventDefault();
                const container = $(event.currentTarget).closest('.combat-result-container');
                const combatResult = container.find('.combat-result');
                const icon = $(event.currentTarget).find('i');
                
                // Toggle visibility
                if (combatResult.is(':visible')) {
                    combatResult.slideUp(200);
                    icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                } else {
                    combatResult.slideDown(200);
                    icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                }
            });
        }
        
        const injuryToggleButton = html.find('.toggle-injury-result');
        if (injuryToggleButton.length) {
            injuryToggleButton.on('click', (event) => {
                event.preventDefault();
                const container = $(event.currentTarget).closest('.combat-result');
                const injuryResult = container.find('.injury-result-container');
                const icon = $(event.currentTarget).find('i');
                
                // Toggle visibility
                if (injuryResult.is(':visible')) {
                    injuryResult.slideUp(200);
                    icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                } else {
                    injuryResult.slideDown(200);
                    icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                }
            });
        }
    });
}

/**
 * Get the proper display name for an actor
 * @param {Object} actor - The actor
 * @returns {string} The display name
 */
function getDisplayName(actor) {
    // If actor is a "descendant" type and associated with a player, use player name
    if (actor?.type === "descendant" && actor.hasPlayerOwner) {
        // Find the player who owns this actor
        const owningPlayer = game.users.find(u => 
            u.character?.id === actor.id || 
            (u.isGM === false && actor.testUserPermission(u, "OWNER"))
        );
        
        if (owningPlayer) {
            return owningPlayer.name;
        }
    }
    
    // Otherwise use actor name
    return actor?.name || "Unknown";
}

/**
 * Create a quarrel initiation message
 * @param {Object} initiator - The initiating actor/token
 * @param {Object} target - The target actor/token
 * @param {Object} checkData - The data from the initiator's check
 */
async function createQuarrelInitiationMessage(initiator, target, checkData) {
    // Get names with proper formatting
    const initiatorName = getDisplayName(initiator.actor || initiator);
    const targetName = getDisplayName(target.actor || target);
    
    console.log(`Witch Iron | Creating quarrel initiation message: ${initiatorName} vs ${targetName}`);
    
    // Create a chat message with the quarrel initiation
    const content = await renderTemplate(
        "systems/witch-iron/templates/chat/quarrel-initiated.hbs", 
        { initiatorName, targetName }
    );
    
    await ChatMessage.create({
        user: game.user.id,
        content: content,
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
}

/**
 * Handle new chat messages that might be check results
 * @param {ChatMessage} message - The new chat message
 */
async function onChatMessageCreated(message) {
    console.log("Witch Iron | New chat message:", message.id);
    
    // Only process chat messages that contain check results
    if (!message.content.includes("witch-iron-roll")) {
        console.log("Witch Iron | Not a check result message, skipping");
        return;
    }
    
    console.log("Witch Iron | Processing check result message:", message.id);
    
    try {
        // Extract hits and actor data from the message
        const content = message.content;
        const hitsMatch = content.match(/data-hits="(-?\d+)"/);
        const actorMatch = content.match(/data-actor="([^"]+)"/);
        const actorIdMatch = content.match(/data-actor-id="([^"]+)"/);
        const isCombatCheck = content.includes('data-combat-check="true"') || content.includes('class="combat-badge"');
        
        console.log(`Witch Iron | Extracted from message - isCombatCheck: ${isCombatCheck}`);
    
        if (!hitsMatch) {
            console.log("Witch Iron | No hits data found, skipping");
            return;
        }
    
        // Parse the hits and get actor information
        const hits = parseInt(hitsMatch[1]);
        const actorId = actorIdMatch ? actorIdMatch[1] : message.speaker.actor;
        const actor = game.actors.get(actorId);
        
        if (!actor) {
            console.log(`Witch Iron | No actor found for ID ${actorId}, skipping`);
            return;
        }
        
        // Always use the data-actor attribute to ensure consistency with the roll card
        const actorName = actorMatch ? actorMatch[1] : actor.name;
        console.log(`Witch Iron | Actor name resolution: data-actor=${actorMatch?.[1]}, actor.name=${actor.name}, display name=${getDisplayName(actor)}, using=${actorName}`);
        
        // Create the check data object with all necessary information
        const checkData = {
            messageId: message.id,
            actorId: actorId,
            actorName: actorName,
            hits: hits,
            roll: message.roll?.total || 0,
            isCombatCheck: isCombatCheck
        };
        
        console.log("Witch Iron | Check data created:", checkData);
        
        // --- CONDITION QUARREL SHORT-CIRCUIT ---
        // If a pending quarrel has `condition`, this is a pure condition check.
        // We bypass all normal combat logic/UI and resolve it as a custom non-combat quarrel:
        // building a quarrelObj with isCombatCheck=false plus customName/icon/skill/resultMessages.
        // Try to find the actor's token
        let actorToken = null;
        const tokens = canvas.tokens.placeables.filter(t => t.actor && t.actor.id === actorId);
        if (tokens.length > 0) {
            // Use the controlled token if possible, otherwise use the first token
            actorToken = tokens.find(t => t.controlled) || tokens[0];
            console.log(`Witch Iron | Found token for actor ${actorId}: ${actorToken.id}`);
        }

        // If this is a pending condition quarrel, resolve it here (non-combat)
        let pendingCond = quarrelTracker.getPendingQuarrelForActor(actorId, actorToken?.id) || quarrelTracker.getPendingQuarrelForActor(actorId);
        if (pendingCond?.condition) {
            console.log("Witch Iron | Pending condition quarrel detected, resolving non-combat condition quarrel");
            const quarrelId = `${pendingCond.messageId}-${message.id}`;
            const initiatorData = {
                actorId: pendingCond.actorId ?? pendingCond.initiator?.actorId,
                checkId: pendingCond.messageId ?? pendingCond.initiator?.checkId,
                tokenId: null,
                hits: pendingCond.hits ?? pendingCond.initiator?.hits
            };
            const responderData = {
                actorId: checkData.actorId,
                checkId: checkData.messageId,
                tokenId: actorToken?.id,
                hits: checkData.hits
            };
            const quarrelObj = {
                id: quarrelId,
                initiator: initiatorData,
                responder: responderData,
                isCombatCheck: false,
                condition: pendingCond.condition,
                customName: pendingCond.customName,
                customIcon: pendingCond.customIcon,
                skill: pendingCond.skill,
                resultMessages: pendingCond.resultMessages
            };
            quarrelTracker.pendingQuarrels.set(quarrelId, quarrelObj);
            // Clear original pending quarrel
            if (actorToken) quarrelTracker.clearPendingQuarrel(actorId, actorToken.id);
            else quarrelTracker.clearPendingQuarrel(actorId);
            const result = await quarrelTracker.resolveQuarrel(quarrelId);
            if (result) ui.notifications.info(`Condition quarrel resolved: ${result.outcome}`);
            return;
        }

        // Check if the actor is already in an active quarrel
        if (quarrelTracker.isActorInActiveQuarrel(actorId)) {
            console.log(`Witch Iron | Actor ${actorId} is already in an active quarrel`);
            
            // Check for pending quarrels targeting this actor/token
            let pendingQuarrel = null;
            
            // First check by token ID if available
            if (actorToken) {
                pendingQuarrel = quarrelTracker.getPendingQuarrelForActor(actorId, actorToken.id);
                console.log(`Witch Iron | Token quarrel check: ${pendingQuarrel ? "Found" : "No"} pending quarrel for token ${actorToken.id}`);
            }
            
            // If no token quarrel found, check by actor ID
            if (!pendingQuarrel) {
                pendingQuarrel = quarrelTracker.getPendingQuarrelForActor(actorId);
                console.log(`Witch Iron | Actor quarrel check: ${pendingQuarrel ? "Found" : "No"} pending quarrel for actor ${actorId}`);
            }
            
            if (pendingQuarrel) {
                console.log("Witch Iron | Pending quarrel found for this actor, resolving");
                
                // Create a unique quarrel ID
                const quarrelId = `${pendingQuarrel.messageId}-${message.id}`;
                
                // Prepare the quarrel with initiator and responder data
                const initiatorData = {
                    actorId: pendingQuarrel.actorId,
                    checkId: pendingQuarrel.messageId,
                    tokenId: null,
                    hits: pendingQuarrel.hits
                };
                
                const responderData = {
                    actorId: checkData.actorId,
                    checkId: checkData.messageId,
                    tokenId: actorToken?.id,
                    hits: checkData.hits
                };
                
                // Create the quarrel object, including any custom quarrel parameters from the pending check
                const { isCombatCheck: pendingCombatFlag, condition, customName, customIcon, skill, resultMessages } = pendingQuarrel;
                const quarrel = {
                    id: quarrelId,
                    initiator: initiatorData,
                    responder: responderData,
                    isCombatCheck: pendingCombatFlag,
                    condition,
                    customName,
                    customIcon,
                    skill,
                    resultMessages
                };
                
                // Add to pending quarrels
                quarrelTracker.pendingQuarrels.set(quarrelId, quarrel);
                
                // Resolve using the tracker instance
                const result = await quarrelTracker.resolveQuarrel(quarrelId);
                
                // After resolution, clear any pending quarrels
                if (actorToken) {
                    quarrelTracker.clearPendingQuarrel(actorId, actorToken.id);
                } else {
                    quarrelTracker.clearPendingQuarrel(actorId);
                }
                
                // Clear initiator actor from active quarrels
                if (pendingQuarrel.actorId) {
                    quarrelTracker.clearAllQuarrelsForActor(pendingQuarrel.actorId);
                }
                
                // Clear responder actor from active quarrels
                quarrelTracker.clearAllQuarrelsForActor(actorId);
                
                // Show notification
                if (result) {
                    ui.notifications.info(`Quarrel resolved: ${result.outcome}`);
                }
                
                return;
            }
            
            return;
        }
        
        // If we have tokens selected and this is a new check, we can initiate a quarrel
        if (canvas.tokens.controlled.length > 0) {
            await processTokenTargetsForQuarrel(actorToken, checkData);
            return;
        }
        
        // If auto-quarrel is enabled and there's a suitable target, initiate a quarrel
        const autoQuarrelSetting = game.settings.get("witch-iron", "autoQuarrel") || false;
        if (autoQuarrelSetting) {
            await automaticQuarrel(checkData);
        }
        
    } catch (error) {
        console.log("Witch Iron | Error processing chat message:", error);
    }
}

/**
 * Automatically initiate quarrels against targeted tokens
 * @param {Object} checkData - Data about the check
 */
async function automaticQuarrel(checkData) {
    // First check if we have any user targets (most reliable in newer Foundry versions)
    const userTargets = game.user.targets;
    if (userTargets && userTargets.size > 0) {
        console.log(`Witch Iron | Using game.user.targets directly with ${userTargets.size} targets`);
        
        let initiatedQuarrel = false;
        for (const target of userTargets) {
            if (target.actor) {
                console.log(`Witch Iron | Target token ${target.id} has actor: ${target.actor.name}`);
                await manualQuarrel(checkData, target);
                initiatedQuarrel = true;
            } else {
                console.log(`Witch Iron | Target token ${target.id} has no actor`);
            }
        }
        
        if (initiatedQuarrel) {
            return;
        } else {
            console.log("Witch Iron | No valid actors found in targeted tokens");
        }
    }
    
    // If no valid user targets, try using controlled tokens
    const controlledTokens = canvas.tokens.controlled;
    
    // If player has a controlled token, use that
    if (controlledTokens.length > 0) {
        console.log(`Witch Iron | Using ${controlledTokens.length} controlled tokens for automatic quarrel`);
        
        // Process each controlled token for targets
        let initiatedAny = false;
        for (const token of controlledTokens) {
            if (await processTokenTargetsForQuarrel(token, checkData)) {
                initiatedAny = true;
            }
        }
        
        // No warning if no targets - user may just be making a regular check
        if (!initiatedAny) {
            console.log("Witch Iron | No targets found for controlled tokens");
        }
        
        return;
    }
    
    // If player has no controlled token but has a character, use that
    const userCharacter = game.user.character;
    if (userCharacter) {
        console.log(`Witch Iron | Using user character ${userCharacter.name} for automatic quarrel`);
        
        // Find tokens for this character
        const characterTokens = canvas.tokens.objects.children.filter(t => 
            t.actor && t.actor.id === userCharacter.id
        );
        
        if (characterTokens.length > 0) {
            let initiatedQuarrel = false;
            for (const token of characterTokens) {
                if (await processTokenTargetsForQuarrel(token, checkData)) {
                    initiatedQuarrel = true;
                }
            }
            
            // No warning if no targets - user may just be making a regular check
            if (!initiatedQuarrel) {
                console.log("Witch Iron | No targets found for character tokens");
            }
        } else {
            console.log("Witch Iron | No tokens found for user character");
        }
        
        return;
    }
    
    console.log("Witch Iron | No controlled tokens or character found, cannot initiate automatic quarrel");
}

/**
 * Process token targets specifically for initiating quarrels
 * @param {Token} token - The token to process targets for
 * @param {Object} checkData - Data about the check
 * @returns {boolean} True if any quarrels were initiated
 */
async function processTokenTargetsForQuarrel(token, checkData) {
    console.log(`Witch Iron | Processing targets for automatic quarrel from token ${token.id}`);
    
    // More detailed debugging about token targeting
    console.log(`Witch Iron | token.targeted:`, token.targeted);
    console.log(`Witch Iron | token._object?.targeted:`, token._object?.targeted);
    console.log(`Witch Iron | token.document?.targeted:`, token.document?.targeted);
    
    // Get the game's current targets to check if this is a Foundry v11+ game
    const userTargets = game.user.targets;
    console.log(`Witch Iron | game.user.targets.size:`, userTargets?.size);
    
    // In v11+, targeting is stored in game.user.targets
    if (userTargets && userTargets.size > 0) {
        console.log(`Witch Iron | Using game.user.targets with ${userTargets.size} targets`);
        
        let initiatedAny = false;
        for (const target of userTargets) {
            if (target.actor) {
                console.log(`Witch Iron | Target token ${target.id} has actor: ${target.actor.name}`);
                await manualQuarrel(checkData, target);
                initiatedAny = true;
            } else {
                console.log(`Witch Iron | Target token ${target.id} has no actor`);
            }
        }
        
        return initiatedAny;
    }
    
    // Try different paths to find targeting data
    let targetCollection = null;
    
    // Try token.targeted (might be in some versions)
    if (token.targeted && typeof token.targeted === 'object') {
        targetCollection = token.targeted;
        console.log(`Witch Iron | Using token.targeted for targets`);
    }
    // Try token._object.targeted (sometimes used in v10)
    else if (token._object && token._object.targeted && typeof token._object.targeted === 'object') {
        targetCollection = token._object.targeted;
        console.log(`Witch Iron | Using token._object.targeted for targets`);
    }
    // Try token.document.targeted (sometimes used in v10)
    else if (token.document && token.document.targeted && typeof token.document.targeted === 'object') {
        targetCollection = token.document.targeted;
        console.log(`Witch Iron | Using token.document.targeted for targets`);
    }
    
    if (!targetCollection) {
        console.log(`Witch Iron | No targeting data found for token ${token.id}`);
        return false;
    }
    
    // Check if the collection has a size property (might be a Set)
    let hasTargets = false;
    if (targetCollection.size !== undefined) {
        hasTargets = targetCollection.size > 0;
        console.log(`Witch Iron | Target collection has ${targetCollection.size} targets (using .size)`);
    }
    // Check if the collection is an object with keys (might be a Map or plain object)
    else if (Object.keys(targetCollection).length > 0) {
        hasTargets = true;
        console.log(`Witch Iron | Target collection has ${Object.keys(targetCollection).length} targets (using Object.keys)`);
    }
    
    if (!hasTargets) {
        console.log(`Witch Iron | No targets found for token ${token.id}`);
        return false;
    }
    
    console.log(`Witch Iron | Processing targets for token ${token.id}`);
    
    let initiatedQuarrel = false;
    
    // Handle Set-like collections (newer Foundry versions)
    if (targetCollection.forEach) {
        targetCollection.forEach(async (targetValue) => {
            // The target might be a token or an object containing a token
            const targetToken = targetValue.t || targetValue.token || targetValue;
            
            if (targetToken) {
                console.log(`Witch Iron | Found target token:`, targetToken);
                await manualQuarrel(checkData, targetToken);
                initiatedQuarrel = true;
            }
        });
    }
    // Handle Map-like collections
    else if (targetCollection.get) {
        for (const [_, targetValue] of targetCollection.entries()) {
            const targetToken = targetValue.t || targetValue.token || targetValue;
            
            if (targetToken) {
                console.log(`Witch Iron | Found target token:`, targetToken);
                await manualQuarrel(checkData, targetToken);
                initiatedQuarrel = true;
            }
        }
    }
    // Handle plain objects
    else {
        for (const key in targetCollection) {
            const targetValue = targetCollection[key];
            const targetToken = targetValue.t || targetValue.token || targetValue;
            
            if (targetToken) {
                console.log(`Witch Iron | Found target token:`, targetToken);
                await manualQuarrel(checkData, targetToken);
                initiatedQuarrel = true;
            }
        }
    }
    
    return initiatedQuarrel;
}

/**
 * Create chat message with quarrel results
 * @param {object} result - The quarrel result data
 */
async function createQuarrelResultMessage(result) {
    // Handle null or incomplete results
    if (!result) {
        console.error("Cannot create quarrel result message: result is null or undefined");
        ui.notifications.error("Failed to create quarrel result message: missing data");
        return null;
    }
    
    // Ensure required properties exist with default values if needed
    result.initiator = result.initiator || {};
    result.responder = result.responder || {};
    // Safety: force non-combat display for condition quarrels
    if (result.condition) {
        result.isCombatCheck = false;
        result.nonCombat = true;
    }
    result.netHits = result.netHits || 0;
    result.isCombatCheck = result.isCombatCheck || false;
    
    // Handle null roll objects
    if (!result.initiator.roll) {
        result.initiator.roll = { total: 0, result: 0 };
    }
    if (!result.responder.roll) {
        result.responder.roll = { total: 0, result: 0 };
    }
    
    console.log("Creating quarrel result message with data:", result);
    
    // Log combat check details if applicable
    if (result.isCombatCheck && result.injuryData) {
        console.log("This is a combat check. Injury data:", result.injuryData);
    }
    
    // Render the chat message template
    const html = await renderTemplate("systems/witch-iron/templates/chat/quarrel-result.hbs", {
        result: result,
        i18n: {
            victory: game.i18n.localize("WITCHIRON.Victory"),
            defeat: game.i18n.localize("WITCHIRON.Defeat")
        }
    });

    // Create the message data
    const messageData = {
        user: game.user.id,
        speaker: {
            alias: "Quarrel Result"
        },
        content: html,
        flags: {
            "witch-iron": {
                quarrelData: result,
                injuryData: result.injuryData || null
            }
        }
    };

    let message = await ChatMessage.create(messageData);
    console.log("Created quarrel result message with ID", message.id);
    
    return message;
}

/**
 * Add Quarrel option to chat message context menu
 * @param {ChatMessage} message - The message object
 * @param {jQuery} html - The jQuery element for the message
 */
function addQuarrelContextOption(message, html) {
    // Check if this is a roll result message with the witch-iron-roll class
    const rollElement = html.find(".witch-iron-roll");
    if (rollElement.length === 0) {
        return;
    }
    
    console.log("Witch Iron | Adding quarrel context menu to message:", message.id);
    
    // Extract hits and other data from the message
    const content = message.content;
    const hitsMatch = content.match(/data-hits="(-?\d+)"/);
    const actorMatch = content.match(/data-actor="([^"]+)"/);
    
    if (!hitsMatch) {
        console.log("Witch Iron | No hits data found in message for context menu");
        return;
    }
    
    const hits = parseInt(hitsMatch[1]);
    const actorId = message.speaker.actor;
    const actor = game.actors.get(actorId);
    // Always use the data-actor attribute to ensure consistency with the roll card
    const actorName = actorMatch ? actorMatch[1] : actor?.name;
    console.log(`Witch Iron | Using actor name from data-actor attribute: ${actorName}`);
    
    // Create check data
    const checkData = {
        messageId: message.id,
        actorId: actorId,
        actorName: actorName,
        hits: hits,
        roll: message.roll?.total || 0
    };
    
    console.log("Witch Iron | Check data prepared for context menu:", checkData);
    
    // Add a menu item to Foundry's built-in chat context menu
    // This hooks into Foundry's own context menu system
    const messageCard = html.closest(".chat-message");
    
    if (!messageCard.length) {
        console.log("Witch Iron | Could not find chat message element for context menu");
        return;
    }
    
    // Add a custom data attribute to identify this message
    messageCard.attr("data-quarrel-message", message.id);
    
    // Register the hook once
    if (!game.witch?.quarrelHookRegistered) {
        // Set up chat message context menu hook
        Hooks.on("getChatLogEntryContext", (html, options) => {
            options.push({
                name: "Quarrel Against",
                icon: '<i class="fas fa-swords"></i>',
                condition: li => li.find(".witch-iron-roll").length,
                callback: li => {
                    // Get the message ID from our custom attribute
                    const messageId = li.attr("data-quarrel-message") || li.data("messageId");
                    if (!messageId) return;
                    
                    // Find the message
                    const msg = game.messages.get(messageId);
                    if (!msg) return;
                    
                    // Extract the data again (we can't easily pass it through the hook)
                    const content = msg.content;
                    const hitsMatch = content.match(/data-hits="(-?\d+)"/);
                    const actorMatch = content.match(/data-actor="([^"]+)"/);
                    
                    if (!hitsMatch) return;
                    
                    const hits = parseInt(hitsMatch[1]);
                    const actorId = msg.speaker.actor;
                    const actor = game.actors.get(actorId);
                    // Always use the data-actor attribute to ensure consistency with the roll card
                    const actorName = actorMatch ? actorMatch[1] : actor?.name;
                    
                    // Create check data
                    const checkData = {
                        messageId: msg.id,
                        actorId: actorId,
                        actorName: actorName,
                        hits: hits,
                        roll: msg.roll?.total || 0
                    };
                    
                    // Select this check
                    console.log("Witch Iron | Quarrel Against selected via context menu:", checkData);
                    quarrelTracker.selectCheck(checkData);
                }
            });
        });
        
        // Mark that we've registered the hook
        if (!game.witch) game.witch = {};
        game.witch.quarrelHookRegistered = true;
        console.log("Witch Iron | Registered chat context menu hook");
    }
    
    // Handle injury creation buttons
    html.find('.create-injury').click(onCreateInjuryClick);
    html.find('.reverse-btn').click(handleReverseClick);
    html.find('.reroll-btn').click(handleRerollClick);
    html.find('.luck-btn').click(handleLuckClick);
}

/**
 * Handle click on the create-injury button in chat messages
 * @param {Event} event The click event
 */
async function onCreateInjuryClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    
    // Get data from button attributes
    const location = button.dataset.location;
    const severity = parseInt(button.dataset.severity);
    const defenderName = button.dataset.defender;
    const description = button.dataset.description;
    const effect = button.dataset.effect;
    
    console.log(`Creating injury for ${defenderName} at ${location} with severity ${severity}`);
    
    // Find the defender actor by name
    const defender = game.actors.find(a => a.name === defenderName);
    
    if (!defender) {
        ui.notifications.error(`Could not find actor named ${defenderName}`);
        return;
    }
    
    // Create the injury item
    const injuryData = {
        name: `${location} Injury`,
        type: "injury",
        img: "icons/svg/blood.svg",
        system: {
            description: description,
            effect: effect,
            location: location,
            severity: {
                value: severity,
                label: getSeverityLabel(severity)
            },
            duration: {
                value: severity * 10,
                unit: "days"
            }
        }
    };
    
    // Create and add the injury to the defender
    try {
        const createdItem = await defender.createEmbeddedDocuments("Item", [injuryData]);
        ui.notifications.info(`Added injury to ${defenderName}`);
        console.log("Created injury:", createdItem);
    } catch (error) {
        ui.notifications.error(`Error creating injury: ${error}`);
        console.error("Error creating injury:", error);
    }
}

/**
 * Get a severity label based on the numeric value
 * @param {number} value The severity value
 * @returns {string} The severity value as a string
 */
function getSeverityLabel(value) {
    return value.toString();
}

/**
 * Allow users to manually initiate a quarrel against a token.
 * @param {Object} sourceCheckData - The check data, with optional custom quarrel settings:
 *   @property {string} customName - Custom header title.
 *   @property {string} customIcon - Custom icon URL.
 *   @property {string} skill - Skill name (e.g. "Hardship" or "Steel").
 *   @property {Object} resultMessages - Follow-up messages { success, failure, cost }.
 * @param {Token} targetToken - The token to quarrel against.
 */
async function manualQuarrel(sourceCheckData, targetToken) {
    try {
        console.log(`Witch Iron | Manually initiating quarrel against token ${targetToken.id}`);
        // Clear any previously selected check to ensure condition quarrels use custom pathway
        quarrelTracker.clearSelectedCheck();
        console.log(`Witch Iron | Target token:`, targetToken);
        console.log(`Witch Iron | Source check data:`, sourceCheckData);
        
        // Handle potential null values
        if (!targetToken) {
            ui.notifications.error("Cannot initiate quarrel: Target token is invalid");
            console.log("Witch Iron | Target token is invalid (null or undefined)");
            return;
        }
        
        // Find the actor in various possible locations
        let actor = null;
        if (targetToken.actor) {
            actor = targetToken.actor;
            console.log(`Witch Iron | Found actor in targetToken.actor: ${actor.name}`);
        } else if (targetToken._actor) {
            actor = targetToken._actor;
            console.log(`Witch Iron | Found actor in targetToken._actor: ${actor.name}`);
        } else if (targetToken.document?.actor) {
            actor = targetToken.document.actor;
            console.log(`Witch Iron | Found actor in targetToken.document.actor: ${actor.name}`);
        }
        
        if (!actor) {
            ui.notifications.error("Cannot initiate quarrel: Target token has no actor");
            console.log("Witch Iron | Target token has no actor, cannot initiate quarrel");
            return;
        }
        
        console.log(`Witch Iron | Found actor for target token: ${actor.name} (${actor.id})`);
        const targetActorId = actor.id;
        const targetTokenId = targetToken.id;
        
        // Check if either actor is already in an active quarrel
        if (quarrelTracker.isActorInActiveQuarrel(targetActorId)) {
            console.log(`Witch Iron | Target actor ${targetActorId} is already in an active quarrel`);
            
            // Check for pending quarrels targeting this actor/token
            let pendingQuarrel = null;
            
            // First check by token ID if available
            if (targetTokenId) {
                pendingQuarrel = quarrelTracker.getPendingQuarrelForActor(targetActorId, targetTokenId);
                console.log(`Witch Iron | Token quarrel check: ${pendingQuarrel ? "Found" : "No"} pending quarrel for token ${targetTokenId}`);
            }
            
            // If no token quarrel found, check by actor ID
            if (!pendingQuarrel) {
                pendingQuarrel = quarrelTracker.getPendingQuarrelForActor(targetActorId);
                console.log(`Witch Iron | Actor quarrel check: ${pendingQuarrel ? "Found" : "No"} pending quarrel for actor ${targetActorId}`);
            }
            
            if (pendingQuarrel) {
                console.log("Witch Iron | Pending quarrel found for this actor, resolving");
                
                // Create a unique quarrel ID
                const quarrelId = `${pendingQuarrel.messageId}-${sourceCheckData.messageId}`;
                
                // Prepare the quarrel with initiator and responder data
                const initiatorData = {
                    actorId: pendingQuarrel.actorId,
                    checkId: pendingQuarrel.messageId,
                    tokenId: null,
                    hits: pendingQuarrel.hits
                };
                
                const responderData = {
                    actorId: sourceCheckData.actorId,
                    checkId: sourceCheckData.messageId,
                    tokenId: targetTokenId,
                    hits: sourceCheckData.hits
                };
                
                // Create the quarrel object, including any custom quarrel parameters from the pending check
                const { isCombatCheck: pendingCombatFlag, condition, customName, customIcon, skill, resultMessages } = pendingQuarrel;
                const quarrel = {
                    id: quarrelId,
                    initiator: initiatorData,
                    responder: responderData,
                    isCombatCheck: pendingCombatFlag,
                    condition,
                    customName,
                    customIcon,
                    skill,
                    resultMessages
                };
                
                // Add to pending quarrels
                quarrelTracker.pendingQuarrels.set(quarrelId, quarrel);
                
                // Resolve using the tracker instance
                const result = await quarrelTracker.resolveQuarrel(quarrelId);
                
                // After resolution, clear any pending quarrels
                if (targetTokenId) {
                    quarrelTracker.clearPendingQuarrel(targetActorId, targetTokenId);
                } else {
                    quarrelTracker.clearPendingQuarrel(targetActorId);
                }
                
                // Clear initiator actor from active quarrels
                if (pendingQuarrel.actorId) {
                    quarrelTracker.clearAllQuarrelsForActor(pendingQuarrel.actorId);
                }
                
                // Clear responder actor from active quarrels
                quarrelTracker.clearAllQuarrelsForActor(targetActorId);
                
                // Show notification
                if (result) {
                    ui.notifications.info(`Quarrel resolved: ${result.outcome}`);
                }
                
                return;
            }
            
            return;
        } else if (sourceCheckData.actorId && quarrelTracker.isActorInActiveQuarrel(sourceCheckData.actorId)) {
            console.log(`Witch Iron | Source actor ${sourceCheckData.actorId} is already in an active quarrel`);
            // Use the existing quarrel - no need to create a new one
        } else {
            // Check if we already have a pending quarrel for this token/actor
            const existingTokenQuarrel = quarrelTracker.getPendingQuarrelForActor(targetActorId, targetTokenId);
            if (existingTokenQuarrel) {
                console.log(`Witch Iron | Already have a pending quarrel for token ${targetTokenId}, replacing it`);
                quarrelTracker.clearPendingQuarrel(targetActorId, targetTokenId);
            }
            
            // Compute custom quarrel parameters (fallbacks for legacy condition quarrels)
            const capitalize = s => typeof s === 'string' ? s.charAt(0).toUpperCase() + s.slice(1) : s;
            const headerTitle = sourceCheckData.customName
                ?? (sourceCheckData.condition ? `${capitalize(sourceCheckData.condition)} Quarrel` : 'Quarrel');
            const headerIcon = sourceCheckData.customIcon
                ?? (sourceCheckData.condition ? CONDITION_ICONS[sourceCheckData.condition] : null);
            const skill = sourceCheckData.skill
                ?? (sourceCheckData.condition
                    ? (['aflame','bleed','poison'].includes(sourceCheckData.condition) ? 'Hardship' : 'Steel')
                    : null);
            const additionalData = {
                customName: headerTitle,
                customIcon: headerIcon,
                skill,
                resultMessages: sourceCheckData.resultMessages || null
            };
            // Register the quarrel with custom parameters
            quarrelTracker.registerPendingQuarrel(sourceCheckData, targetActorId, targetTokenId, additionalData);
            
            // Create a chat message for the initiation
            const responderName = getDisplayName(actor);
            console.log(`Witch Iron | Responder name resolution: actor.name=${actor.name}, getDisplayName=${responderName}`);
            
            // Prepare template data for the initiation, using the module-scoped constant directly
            const templateData = {
                initiator: headerTitle,
                responder: responderName,
                hits: sourceCheckData.hits,
                headerIcon,
                headerTitle,
                skill,
                resultMessages: sourceCheckData.resultMessages || null
            };
            
            console.log(`Witch Iron | Creating quarrel initiation message with template data:`, templateData);
            
            try {
                const content = await renderTemplate("systems/witch-iron/templates/chat/quarrel-initiation.hbs", templateData);
                
                // Create message data with version compatibility
                const messageData = {
                    content: content,
                    whisper: [game.user.id]
                };
                
                // Handle Foundry version differences
                if (game.release.generation >= 12) {
                    messageData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
                } else {
                    messageData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;
                }
                
                await ChatMessage.create(messageData);
                
                ui.notifications.info(`Quarrel initiated against ${responderName}`);
            } catch (templateError) {
                console.error("Witch Iron | Error rendering quarrel template:", templateError);
                ui.notifications.error("Error creating quarrel message, but quarrel was registered");
                
                // Even if the message fails, we still registered the quarrel
                ui.notifications.info(`Quarrel initiated against ${responderName}`);
            }
        }
    } catch (error) {
        console.error("Witch Iron | Error in manualQuarrel:", error);
        ui.notifications.error("An error occurred while initiating the quarrel");
    }
}

/**
 * Get hit location name from roll value
 * @param {number} roll - d10 roll value
 * @returns {string} Hit location name
 */
function getHitLocation(roll) {
    const locationMap = {
        1: "Head",
        2: "Jaw",
        3: "Neck",
        4: "Arm",
        5: "Hand",
        6: "Torso",
        7: "Guts",
        8: "Leg",
        9: "Foot",
        10: "Eye"
    };
    return locationMap[roll] || "Torso";
}

/**
 * Determine injury based on hit location and net damage
 * @param {number} locationRoll - The d10 roll for hit location
 * @param {number} netDamage - The net damage after soak
 * @returns {Object} The injury data
 */
function determineInjury(locationRoll, netDamage) {
  // Map d10 roll to body location
  let location;
  switch (locationRoll) {
    case 1: location = "Head"; break;
    case 2: location = "Face"; break;
    case 3: location = "Neck"; break;
    case 4: location = "Chest"; break;
    case 5: location = "Back"; break;
    case 6: location = "Arm"; break;
    case 7: location = "Hand"; break;
    case 8: location = "Leg"; break;
    case 9: location = "Foot"; break;
    case 10: location = "Jaw"; break;
    default: location = "Torso"; // Fallback
  }
  
  let description, effect, conditions;
  let requiresMedicalAid = false;
  let requiresSurgery = false;

  if (netDamage <= 0) {
    return null; // No injury
  } else if (netDamage <= 2) {
    // Different descriptions based on location
    if (location === "Head") {
      description = "Minor Concussion";
      effect = "Dazed for 1 round";
      conditions = "Light Wound 1";
    } else if (location === "Jaw") {
      description = "Dislocated Jaw";
      effect = "Difficult to speak clearly";
      conditions = "Light Wound 1";
    } else {
      description = `${location} Injury`;
      effect = "Painful but not debilitating";
      conditions = "Light Wound 1";
    }
    
    requiresMedicalAid = true;
  } else if (netDamage <= 4) {
    // Different descriptions based on location
    if (location === "Head") {
      description = "Concussion";
      effect = "Disoriented, -1 to all mental actions";
      conditions = "Medium Wound 1";
    } else if (location === "Jaw") {
      description = "Broken Jaw";
      effect = "Cannot speak properly, difficult to eat";
      conditions = "Medium Wound 1";
    } else {
      description = `${location} Injury`;
      effect = "Significantly impairs function";
      conditions = "Medium Wound 1";
    }
    
    requiresMedicalAid = true;
  } else {
    // Different descriptions based on location
    if (location === "Head") {
      description = "Severe Head Trauma";
      effect = "Unconscious for 1d6 hours, possible long-term effects";
      conditions = "Heavy Wound 2";
    } else if (location === "Jaw") {
      description = "Shattered Jaw";
      effect = "Cannot speak or eat solid food";
      conditions = "Heavy Wound 2";
    } else {
      description = `${location} Injury`;
      effect = "Critical damage, may be permanent";
      conditions = "Heavy Wound 2";
    }
    
    requiresMedicalAid = true;
    requiresSurgery = true;
  }

  return {
    location,
    locationRoll,
    severity: getSeverityLabel(Math.max(0, Math.min(5, Math.round(netDamage / 2)))),
    description,
    effect,
    conditions,
    requiresMedicalAid,
    requiresSurgery
  };
}

/**
 * Initialize the Handlebar helpers for quarrel messages
 */
function initQuarrelHandlebarHelpers() {
    // Ensure common helpers are available
    registerCommonHandlebarsHelpers();
    Handlebars.registerHelper('actorName', function(actorId) {
        const actor = game.actors.get(actorId);
        return actor ? actor.name : "Unknown";
    });
    
    // Helper to concatenate strings
    Handlebars.registerHelper('concat', function(...args) {
        args.pop(); // Remove the options object
        return args.join('');
    });
    
    // Add helper for absolute values
    Handlebars.registerHelper('abs', function(num) {
        return Math.abs(Number(num));
    });
    
    // Add a more specific localization helper for quarrel outcomes
    Handlebars.registerHelper('outcomeLocalize', function(outcome) {
        const key = `WITCHIRON.${outcome}`;
        const localized = game.i18n.localize(key);
        
        // If localization returned the key itself, it means the key doesn't exist
        if (localized === key) {
            console.log(`Witch Iron | Missing localization for key: ${key}`);
            return outcome; // Return the raw outcome as a fallback
        }
        
        return localized;
    });
    
    // Helper to capitalize the first letter of a string
    Handlebars.registerHelper('capitalize', function(text) {
        if (typeof text !== 'string') return text || '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    });
}

/**
 * Get the image to use for an actor in a quarrel
 * @param {Actor} actor - The actor to get the image for
 * @returns {string} The image path
 */
function getActorImage(actor) {
    if (!actor) return "icons/svg/mystery-man.svg";
    
    // Try to find a token for this actor on the canvas
    const tokens = canvas.tokens.placeables.filter(t => t.actor && t.actor.id === actor.id);
    if (tokens.length > 0) {
        // Use the controlled token if possible, otherwise use the first token
        const token = tokens.find(t => t.controlled) || tokens[0];
        return token.document?.texture?.src || token.actor?.img || "icons/svg/mystery-man.svg";
    }
    
    // Fall back to actor's image
    return actor.img || "icons/svg/mystery-man.svg";
}

// -------------------------------------------------------------
// Roll Modification Helpers
// -------------------------------------------------------------

function computeCheckResult(rollTotal, targetValue, additionalHits = 0, ignoreDoubles = false) {
    const isSuccess = rollTotal <= targetValue;
    const isDouble = rollTotal % 11 === 0 && rollTotal !== 100;
    const isCriticalSuccess = rollTotal <= 5 || (isSuccess && isDouble && !ignoreDoubles);
    const isFumble = rollTotal >= 96 || (!isSuccess && isDouble && !ignoreDoubles);
    const baseHits = Math.floor(targetValue / 10) - Math.floor(rollTotal / 10);
    let hits = baseHits + additionalHits;
    if (isCriticalSuccess) hits = Math.max(hits + 1, 1);
    if (isFumble) hits = Math.min(hits - 1, -1);
    return { isSuccess, isCriticalSuccess, isFumble, hits };
}

async function updateRollMessage(message, card, newRoll, { luckSpent = false } = {}) {
    const targetValue = Number(card.dataset.target) || 0;
    const additionalHits = Number(card.dataset.additionalHits) || 0;
    const label = card.dataset.label || "";
    const specialization = card.dataset.specialization || null;
    const situationalMod = Number(card.dataset.situationalMod) || 0;
    const isCombatCheck = card.dataset.combatCheck === "true";
    const actorId = card.dataset.actorId;
    const actorName = card.dataset.actor;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const result = computeCheckResult(newRoll, targetValue, additionalHits, luckSpent);

    const templateData = {
        actor: actor,
        roll: { total: newRoll, formula: "1d100" },
        targetValue,
        label,
        isSuccess: result.isSuccess,
        isCriticalSuccess: result.isCriticalSuccess,
        isFumble: result.isFumble,
        hits: result.hits,
        specialization,
        situationalMod,
        additionalHits,
        isCombatCheck,
        actorId,
        actorName
    };

    const newContent = await renderTemplate("systems/witch-iron/templates/chat/roll-card.hbs", templateData);
    await message.update({ content: newContent });
}

async function handleReverseClick(event) {
    event.preventDefault();
    const messageElement = event.currentTarget.closest('.message');
    const messageId = messageElement?.dataset?.messageId;
    if (!messageId) return;
    const message = game.messages.get(messageId);
    const card = messageElement.querySelector('.witch-iron-roll');
    if (!message || !card) return;

    const current = Number(card.dataset.roll);
    let reversed = current;
    if (current !== 100) {
        const tens = Math.floor(current / 10);
        const units = current % 10;
        reversed = units * 10 + tens;
        if (reversed === 0) reversed = 100;
    }

    await updateRollMessage(message, card, reversed, { luckSpent: card.dataset.luckSpent === "true" });
}

async function handleRerollClick(event) {
    event.preventDefault();
    const messageElement = event.currentTarget.closest('.message');
    const messageId = messageElement?.dataset?.messageId;
    if (!messageId) return;
    const message = game.messages.get(messageId);
    const card = messageElement.querySelector('.witch-iron-roll');
    if (!message || !card) return;

    const roll = await (new Roll('1d100')).evaluate({ async: true });
    await updateRollMessage(message, card, roll.total);
}

async function handleLuckClick(event) {
    event.preventDefault();
    const messageElement = event.currentTarget.closest('.message');
    const messageId = messageElement?.dataset?.messageId;
    if (!messageId) return;
    const message = game.messages.get(messageId);
    const card = messageElement.querySelector('.witch-iron-roll');
    if (!message || !card) return;

    const actorId = card.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (!actor) return;
    const available = Number(actor.system?.attributes?.luck?.value || 0);

    const dialogContent = `<p>Spend Luck to modify roll (available: ${available})</p><input type="number" name="luck" value="0" />`;
    const delta = await new Promise(resolve => {
        new Dialog({
            title: 'Spend Luck',
            content: dialogContent,
            buttons: {
                ok: {
                    label: 'Apply',
                    callback: html => {
                        const val = parseInt(html.find('input[name="luck"]').val()) || 0;
                        resolve(val);
                    }
                },
                cancel: { label: 'Cancel', callback: () => resolve(null) }
            },
            default: 'ok'
        }).render(true);
    });

    if (delta === null || delta === 0) return;
    const spend = Math.min(Math.abs(delta), available);
    const finalDelta = delta > 0 ? spend : -spend;

    await actor.update({ 'system.attributes.luck.value': available - spend });
    const current = Number(card.dataset.roll);
    await updateRollMessage(message, card, current + finalDelta, { luckSpent: true });
}

// Export the QuarrelTracker for potential use in other modules
export { quarrelTracker, manualQuarrel }; 