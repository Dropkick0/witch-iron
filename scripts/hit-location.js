/**
 * Hit Location Selection Module for Witch Iron
 */

// Import the injury tables
import { rollOnInjuryTable, getFullInjuryName, getInjuryEffect } from './injury-tables.js';

// Add a log message when this module is loaded
console.log("Witch Iron | Hit Location module loaded");

// Helper functions for mob scale and rout checks
function getMobScale(bodies) {
    if (bodies >= 100) return "huge";
    if (bodies >= 50) return "large";
    if (bodies >= 20) return "medium";
    if (bodies >= 5) return "small";
    return "none";
}

function scaleRank(scale) {
    switch (scale) {
        case "huge": return 4;
        case "large": return 3;
        case "medium": return 2;
        case "small": return 1;
        default: return 0;
    }
}

async function selectTokenDialog(title = "Select Leader Token") {
    const tokens = canvas.tokens.placeables;
    const options = tokens.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
    return new Promise(resolve => {
        new Dialog({
            title,
            content: `<form><div class="form-group"><label>Token:</label><select name="token">${options}</select></div></form>`,
            buttons: {
                select: {
                    label: "Select",
                    callback: html => {
                        const id = html.find('select[name="token"]').val();
                        resolve(canvas.tokens.get(id) || null);
                    }
                },
                cancel: {
                    label: "Cancel",
                    callback: () => resolve(null)
                }
            },
            default: "select"
        }).render(true);
    });
}

async function performRoutRoll(actor, label, targetValue) {
    const roll = await new Roll("1d100").evaluate({async: true});
    const rollTotal = roll.total;
    const isSuccess = rollTotal <= targetValue;
    const isCriticalSuccess = rollTotal <= 5 || (isSuccess && rollTotal % 11 === 0);
    const isFumble = rollTotal >= 96 || (!isSuccess && rollTotal % 11 === 0);
    let hits = Math.floor(targetValue/10) - Math.floor(rollTotal/10);
    if (isCriticalSuccess) hits = Math.max(hits + 1, 6);
    if (isFumble) hits = Math.min(hits - 1, -6);

    const content = await renderTemplate("systems/witch-iron/templates/chat/roll-card.hbs", {
        actor,
        roll,
        targetValue,
        label,
        isSuccess,
        isCriticalSuccess,
        isFumble,
        hits,
        situationalMod: 0,
        additionalHits: 0,
        isCombatCheck: false,
        actorId: actor.id,
        actorName: actor.name
    });

    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({actor}),
        content,
        sound: CONFIG.sounds.dice
    });

    return isSuccess;
}

async function handleMobScaleRout(mobActor, oldBodies, newBodies) {
    const oldScale = getMobScale(oldBodies);
    const newScale = getMobScale(newBodies);
    if (scaleRank(newScale) >= scaleRank(oldScale)) return;

    return new Promise(resolve => {
        new Dialog({
            title: "Mob Losses",
            content: `<p>${mobActor.name} has been reduced to <strong>${newScale}</strong> scale. Is a leader nearby?</p>`,
            buttons: {
                mob: {
                    label: "No (Mob Rolls Steel)",
                    callback: async () => {
                        const target = mobActor.system.derived?.abilityScore || 0;
                        const success = await performRoutRoll(mobActor, "Steel Check", target);
                        if (!success) await mobActor.update({"system.mob.bodies.value": 0});
                        await createRoutResultCard(mobActor.name, success);
                        resolve();
                    }
                },
                leader: {
                    label: "Yes (Select Leader)",
                    callback: async () => {
                        const token = await selectTokenDialog();
                        let success = false;
                        if (token && token.actor) {
                            const leader = token.actor;
                            if (leader.type === "monster") {
                                const t = leader.system.derived?.abilityScore || 0;
                                success = await performRoutRoll(leader, "Leadership Check", t);
                            } else {
                                const attr = leader.system.attributes?.personality?.value || 0;
                                const skill = leader.system.skills?.social?.leadership?.value || 0;
                                const t = attr + skill;
                                success = await performRoutRoll(leader, "Leadership Check", t);
                            }
                        } else {
                            const target = mobActor.system.derived?.abilityScore || 0;
                            success = await performRoutRoll(mobActor, "Steel Check", target);
                        }
                        if (!success) await mobActor.update({"system.mob.bodies.value": 0});
                        await createRoutResultCard(mobActor.name, success);
                        resolve();
                    }
                }
            },
            default: "mob",
            classes: ["rout-check-dialog"]
        }).render(true);
    });
}

export class HitLocationSelector {
    /**
     * Generate a unique ID for the combat workflow
     * @returns {string} Unique ID
     * @static
     */
    static generateCombatId() {
        return `combat-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }

    /**
     * Opens the hit location selector dialog
     * @param {object} data Data for the dialog
     * @static
     */
    static async openDialog(data) {
        console.log("Opening hit location selector dialog with data:", data);
        
        // Ensure we have valid input data
        if (!data) data = {};
        
        // Generate a unique combat ID if not provided
        if (!data.combatId) {
            data.combatId = this.generateCombatId();
            console.log(`Generated new combat ID: ${data.combatId}`);
        }
        
        // Ensure netHits is properly parsed as a number
        const netHits = parseInt(data.netHits) || 0;
        console.log(`Opening dialog with ${netHits} net hits`);
        
        // Create dialog data
        const dialogData = {
            attacker: data.attacker,
            defender: data.defender,
            damageAmount: data.damage || 0,
            defenderName: data.defender || "Target",
            netHits: netHits,
            remainingHits: netHits,
            autoApply: true,
            combatId: data.combatId,
            weaponDamage: data.weaponDmg || 0,
            soakValues: {},
            armorValues: {},
            locations: ["head","torso","left-arm","right-arm","left-leg","right-leg"],
            defenderImg: "icons/svg/mystery-man.svg",
            applyHitCallback: (location, remainingHits) => {
                this._applyHit(
                    data.attacker,
                    data.defender,
                    data.damage,
                    location,
                    data.messageId,
                    remainingHits,
                    data.combatId,
                    data.weaponDmg || 0,
                    data.soak || 0
                );
            }
        };
        
        // Get battle wear data if we have attacker and defender names
        if (data.attacker && data.defender) {
            const bwData = await this._getBattleWearData(data.attacker, data.defender, 'torso');
            dialogData.battleWear = { attacker: bwData.attacker, defender: bwData.defender };

            const defActor = bwData.actors.defender;
            if (defActor) {
                dialogData.defenderImg = bwData.defender.tokenImg;
                const anat = defActor.system?.anatomy || {};
                dialogData.soakValues = {
                    head: Number(anat.head?.soak || 0),
                    torso: Number(anat.torso?.soak || 0),
                    leftArm: Number(anat.leftArm?.soak || 0),
                    rightArm: Number(anat.rightArm?.soak || 0),
                    leftLeg: Number(anat.leftLeg?.soak || 0),
                    rightLeg: Number(anat.rightLeg?.soak || 0)
                };
                dialogData.armorValues = {
                    head: Number(anat.head?.armor || 0),
                    torso: Number(anat.torso?.armor || 0),
                    leftArm: Number(anat.leftArm?.armor || 0),
                    rightArm: Number(anat.rightArm?.armor || 0),
                    leftLeg: Number(anat.leftLeg?.armor || 0),
                    rightLeg: Number(anat.rightLeg?.armor || 0)
                };
            }
        }
        
        // Create and render a new dialog
        const dialog = new HitLocationDialog(dialogData);
            dialog.render(true);
    }
    
    /**
     * Apply the hit to the selected location
     * @param {string} attacker Name of the attacker
     * @param {string} defender Name of the defender
     * @param {number} damage Amount of damage to apply
     * @param {string} location Hit location
     * @param {string} messageId ID of the combat message
     * @param {number} remainingHits Net hits remaining after location adjustments
     * @param {string} combatId Unique ID of the combat workflow
     * @param {number} weaponDmg Weapon damage
     * @param {number} soak Soak
     * @private
     */
    static async _applyHit(attacker, defender, damage, location, messageId, remainingHits, combatId, weaponDmg, soak) {
        // Normalize location to capitalize first letter of each word for display
        const displayLocation = location.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        // Find the defender actor
        let defenderActor = null;
        
        // First look in tokens
        for (const token of canvas.tokens.placeables) {
            if (token.name === defender && token.actor) {
                defenderActor = token.actor;
                break;
            }
        }
        
        // If not found in tokens, look in actors directory
        if (!defenderActor) {
            defenderActor = game.actors.find(a => a.name === defender);
        }
        
        // Get the original message for combat data
        const originalMessage = game.messages.get(messageId);
        let locationRoll = 0;
        let quarrelData = null;
        
        // Use the params passed to this function directly
        let netHits = (remainingHits !== undefined) ? remainingHits : 0;
        
        // Important: Use the directly passed weaponDmg and soak if provided
        if (weaponDmg !== undefined) {
            console.log(`Using passed weaponDmg: ${weaponDmg}`);
        }
        
        if (soak !== undefined) {
            console.log(`Using passed soak: ${soak}`);
        }
        
        if (originalMessage) {
            // Try to get quarrelData flag
            quarrelData = originalMessage.getFlag("witch-iron", "quarrelData");
            
            // Parse debug info if available
            const debugInfo = originalMessage.content && 
                               $(originalMessage.content).find('.debug-info').length && 
                              this._parseDebugInfo($(originalMessage.content).find('.debug-info').html());
            
            // Use data from debug info for location roll if available
            if (debugInfo) {
                locationRoll = debugInfo.locationRoll || 0;
            }
        }
        
        console.log(`Hit location data: damage=${damage}, weaponDmg=${weaponDmg}, soak=${soak}, netHits=${netHits}`);
        
        // Create a combined combat data object
        const combatData = {
            attacker: attacker,
            defender: defender,
            location: displayLocation,
            severity: damage,  // This will be recalculated by _createInjuryMessage
            originalDamage: damage,  // Store original net hits for reference
            weapon: weaponDmg > 0 ? `${weaponDmg}` : "-",
            weaponDmg: weaponDmg,
            soak: soak,
            netHits: netHits,
            locationRoll: locationRoll,
            messageId: messageId,
            isDeflected: false,  // Don't decide deflection here, let the injury message calculate it
            remainingNetHits: remainingHits || 0,
            combatId: combatId,
            preserveDamage: false  // Force proper damage calculation
        };
        
        // Create the injury chat message
        await this._createInjuryMessage(combatData);
        
        // If we found the defender actor and we're a GM, prepare to create an injury item
        if (defenderActor && game.user.isGM) {
            // Generate effect for the injury - we'll create the actual item after battle wear is applied
            const injuryEffect = this._generateInjuryEffect(location, damage);
            
            // Store this info for later use if needed
            if (!game.witch) game.witch = {};
            if (!game.witch.pendingInjuries) game.witch.pendingInjuries = {};
            game.witch.pendingInjuries[combatId] = {
                actor: defenderActor,
                location: displayLocation,
                damage: damage,
                effect: injuryEffect
            };
        }
    }
    
    /**
     * Parse debug info from the message HTML
     * @param {string} debugHtml Debug info HTML
     * @returns {Object} Parsed injury data
     * @private
     */
    static _parseDebugInfo(debugHtml) {
        const data = {};
        const lines = debugHtml.split("\n");
        
        lines.forEach(line => {
            const match = line.match(/<div>([^:]+):\s*([^<]+)<\/div>/);
            if (match) {
                const key = match[1];
                const value = match[2].trim();
                
                if (key === "soak" || key === "weaponDmg" || key === "netHits" || key === "netDamage" || key === "locationRoll") {
                    data[key] = parseInt(value) || 0;
                } else {
                    data[key] = value;
                }
            }
        });
        
        return data;
    }
    
    /**
     * Generate an injury effect description based on location and damage
     * @param {string} location Hit location
     * @param {number} damage Amount of damage
     * @returns {string} Effect description
     * @private
     */
    static _generateInjuryEffect(location, damage) {
        // Normalize location to capitalize first letter of each word
        const normalizedLocation = location.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        // First, check if we have a detailed injury table for this location
        // Get the base location (head, torso, arm, leg)
        let baseLocation = null;
        
        if (normalizedLocation.includes('Head')) {
            baseLocation = 'head';
        } else if (normalizedLocation.includes('Torso')) {
            baseLocation = 'torso';
        } else if (normalizedLocation.includes('Arm')) {
            baseLocation = 'arm';
        } else if (normalizedLocation.includes('Leg')) {
            baseLocation = 'leg';
        }
        
        // If we have a base location, determine the specific injury
        if (baseLocation) {
            // Ensure temporary storage exists
            if (!game.witch) game.witch = {};
            if (!game.witch.currentInjury) game.witch.currentInjury = {};
            
            // Check if a roll already exists for this injury instance
            let locationRoll = game.witch.currentInjury.locationRoll;
            
            // If no roll exists, perform it ONCE and store it
            if (locationRoll === undefined || locationRoll === null) {
                locationRoll = Math.floor(Math.random() * 10) + 1;
                game.witch.currentInjury.locationRoll = locationRoll; // Store the roll
                console.log(`Rolled NEW specific location for ${baseLocation}: ${locationRoll}`);
            } else {
                console.log(`Using EXISTING specific location roll for ${baseLocation}: ${locationRoll}`);
            }
            
            // Get the detailed injury using the determined roll
            const injury = rollOnInjuryTable(baseLocation, locationRoll);
            
            // If we have a valid injury, get the effect
            if (injury) {
                const specificLocation = getFullInjuryName(injury);
                const effect = getInjuryEffect(injury, damage);
                
                // Store the specific location and effect (roll is already stored)
                game.witch.currentInjury.baseLocation = baseLocation;
                game.witch.currentInjury.specificLocation = specificLocation;
                game.witch.currentInjury.effect = effect;
                
                console.log(`Detailed injury: ${baseLocation} (${locationRoll}) -> ${specificLocation} with effect: ${effect}`);
                
                return effect;
            }
        }
        
        // Fallback to original generic logic if no detailed table or injury found
        console.log("Falling back to generic injury effect generation");
        const lowEffect = "Pain 1";
        const medEffect = "Pain 2";
        const highEffect = "Trauma 2";
        
        let effect = "";
        
        // Determine effect based on location and damage
        if (normalizedLocation === "Head") {
            if (damage >= 7) {
                effect = "Concussion, Stun 3";
            } else if (damage >= 4) {
                effect = "Disoriented, Stun 2";
            } else {
                effect = "Mild Pain, Stun 1";
            }
        } else if (normalizedLocation === "Torso") {
            if (damage >= 7) {
                effect = "Internal Damage, Bleed 3";
            } else if (damage >= 4) {
                effect = "Winded, Stun 2";
            } else {
                effect = "Bruised Ribs, Pain 1";
            }
        } else if (normalizedLocation.includes("Arm")) {
            if (damage >= 7) {
                effect = "Broken, Useless Arm, Trauma 3";
            } else if (damage >= 4) {
                effect = "Damaged Muscle, Half Effectiveness, Pain 2";
            } else {
                effect = "Bruised Arm, Pain 1";
            }
        } else if (normalizedLocation.includes("Leg")) {
            if (damage >= 7) {
                effect = "Broken, Can't Stand, Trauma 3";
            } else if (damage >= 4) {
                effect = "Hampered Movement, Half Speed, Pain 2";
            } else {
                effect = "Bruised Leg, Pain 1";
            }
        }
        
        return effect;
    }

    /**
     * Remove the leading descriptor from an injury effect string
     * e.g. "Severed, Lost Leg|Bleed 5" -> "Lost Leg|Bleed 5"
     * @param {string} effect The raw effect text
     * @returns {string} The effect text without the descriptor
     * @private
     */
    static _trimEffectName(effect) {
        if (!effect) return effect;
        const commaIndex = effect.indexOf(',');
        if (commaIndex === -1) return effect.trim();
        return effect.slice(commaIndex + 1).trim();
    }
    
    /**
     * Create an injury message in chat
     * @param {object} combatData The combat data including attacker, defender, location, etc.
     * @private
     */
    static async _createInjuryMessage(combatData) {
        // If preserveDamage flag is set, use the original damage value directly
        if (combatData.preserveDamage) {
            combatData.severity = combatData.originalDamage || combatData.severity;
            console.log(`Preserving original damage value: ${combatData.severity}`);
        } 
        
        // Ensure we have a combatId
        if (!combatData.combatId) {
            combatData.combatId = this.generateCombatId();
            console.log(`Generated new combat ID for injury message: ${combatData.combatId}`);
        }
        
        // Clear any previous temporary injury data before processing the new one
        if (game.witch) game.witch.currentInjury = {};
        
        // Get battle wear data AND actor references from attacker and defender
        const normalizedLocation = combatData.location.toLowerCase().replace(/\s+/g, "-");
        const returnData = await this._getBattleWearData(
            combatData.attacker,
            combatData.defender,
            normalizedLocation
        );
        const battleWearDataForTemplate = { attacker: returnData.attacker, defender: returnData.defender }; // Separate for template clarity
        const attackerActor = returnData.actors.attacker; // Use actor from _getBattleWearData
        const defenderActor = returnData.actors.defender; // Use actor from _getBattleWearData
        
        // Initialize bonuses
        let attackerAbilityBonus = 3; 
        let defenderAbilityBonus = 3; 
        let weaponBonus = 0; // Effective bonus for calc
        let armorBonus = 0;  // Effective bonus for calc
        let weaponBonusMax = 0; // Max bonus for display
        let armorBonusMax = 0;  // Max bonus for display
        
        // Get bonuses from the fetched actors
        if (attackerActor) {
            attackerAbilityBonus = attackerActor.system?.derived?.abilityBonus || 3;
            weaponBonus = attackerActor.system?.derived?.weaponBonusEffective || 0; 
            weaponBonusMax = attackerActor.system?.derived?.weaponBonusMax || 0; 
            console.log(`Attacker ${combatData.attacker} - Ability: ${attackerAbilityBonus}, Effective Weapon: ${weaponBonus}, Max Weapon: ${weaponBonusMax}`);
        }
        
        if (defenderActor) {
            defenderAbilityBonus = defenderActor.system?.derived?.abilityBonus || 3;
            const locMap = { head:'head', torso:'torso', 'left-arm':'leftArm', 'right-arm':'rightArm', 'left-leg':'leftLeg', 'right-leg':'rightLeg' };
            const locKey = locMap[normalizedLocation] || normalizedLocation;
            armorBonus = defenderActor.system?.derived?.armorBonusEffective?.[locKey] || 0;
            armorBonusMax = defenderActor.system?.derived?.armorBonusMax || 0;
            console.log(`Defender ${combatData.defender} - Ability: ${defenderAbilityBonus}, Effective Armor: ${armorBonus}, Max Armor: ${armorBonusMax}`);
        }
        
        // *** IMPORTANT: Use the REMAINING net hits after location adjustments ***
        const netHits = combatData.remainingNetHits !== undefined 
            ? Math.abs(combatData.remainingNetHits) 
            : Math.abs(combatData.netHits || 0);
            
        console.log(`Using remaining net hits for damage calculation: ${netHits} (original: ${combatData.netHits}, remaining: ${combatData.remainingNetHits})`);
        
        // Calculate net damage using correct formula: (Damage + Net Hits) - Soak
        // Using EFFECTIVE bonuses for calculation
        const attackerDamage = attackerAbilityBonus + weaponBonus; // weaponBonus IS the effective bonus
        const defenderSoak = defenderAbilityBonus + armorBonus;   // armorBonus IS the effective bonus
        const baseDamage = Math.max(0, (attackerDamage + netHits) - defenderSoak);

        let netDamage = baseDamage; // Use the base damage calculated with effective bonuses

        console.log(`INITIAL damage calculation using EFFECTIVE bonuses: (${attackerAbilityBonus} ability + ${weaponBonus} effective weapon + ${netHits} remaining net hits) - (${defenderAbilityBonus} ability + ${armorBonus} effective armor) = ${netDamage}`);
        
        // Format the display text for damage and soak using EFFECTIVE bonuses
        // Change weaponBonusMax -> weaponBonus and armorBonusMax -> armorBonus
        const damageText = `${attackerAbilityBonus}(${weaponBonus})`; // Use effective weapon bonus
        const soakText = `${defenderAbilityBonus}(${armorBonus})`;   // Use effective armor bonus

        // --- Mob handling: convert damage into body losses ---
        if (defenderActor?.system?.mob?.isMob?.value && (defenderActor.system.mob.bodies.value || 0) >= 5) {
            const currentBodies = defenderActor.system.mob.bodies.value || 0;
            const bodiesKilled = Math.floor(netDamage / 5);
            const remainingBodies = Math.max(0, currentBodies - bodiesKilled);

            if (bodiesKilled > 0) {
                await defenderActor.update({ "system.mob.bodies.value": remainingBodies });
            }

            const oldScale = getMobScale(currentBodies);
            const newScale = getMobScale(remainingBodies);
            const scaleChange = scaleRank(newScale) < scaleRank(oldScale);
            const totalBodies = remainingBodies + bodiesKilled;
            const lossPercent = totalBodies > 0 ? Math.round((bodiesKilled * 100) / totalBodies) : 0;

            const mobContent = await renderTemplate(
                "systems/witch-iron/templates/chat/mob-injury-message.hbs",
                {
                    attacker: combatData.attacker,
                    defender: combatData.defender,
                    killed: bodiesKilled,
                    remaining: remainingBodies,
                    damage: netDamage,
                    damageText: damageText,
                    soakText: soakText,
                    netHits: netHits,
                    netDamage: netDamage,
                    location: combatData.location,
                    scaleChange: scaleChange,
                    newScale: newScale,
                    lossPercent: lossPercent
                }
            );

            const mobMessage = await ChatMessage.create({
                user: game.user.id,
                content: mobContent,
                speaker: ChatMessage.getSpeaker(),
                flavor: "Mob Casualties",
                flags: {
                    "witch-iron": {
                        messageType: "mob-injury",
                        combatId: combatData.combatId
                    }
                }
            });



            // Check if mob scale has been reduced and possibly trigger a rout check
            await handleMobScaleRout(defenderActor, currentBodies, remainingBodies);

            return mobMessage;
        }

        // Set the flavor text and message type based on whether the attack was deflected
        const isDeflected = netDamage <= 0;
        const flavor = isDeflected ? "Attack Deflected" : "Combat Injury";
        const messageType = isDeflected ? "deflection" : "injury";
        
        // Generate injury effect first so we can use it for the description
        const fullEffect = HitLocationSelector._generateInjuryEffect(combatData.location.toLowerCase().replace(' ', '-'), netDamage);
        const effect = HitLocationSelector._trimEffectName(fullEffect);
        const description = this._generateInjuryDescription(combatData.location, netDamage, fullEffect);
        
        // Retrieve the specific location details stored by _generateInjuryEffect
        const specificLocation = game.witch?.currentInjury?.specificLocation || null;
        const locationRoll = game.witch?.currentInjury?.locationRoll || null;

        // Determine tooltip text based on effect symbols
        let tooltipText = "";
        if (effect.includes('*')) {
            const hits = Math.floor(netDamage / 2);
            tooltipText = `Medical Aid*: Quarrel vs ${hits} Hits`;
        } else if (effect.includes('‡')) {
            const hits = netDamage;
            tooltipText = `Surgery‡: Quarrel vs ${hits} Hits or Advanced Surgery`;
        }

        console.log(`Creating injury message for combat ID: ${combatData.combatId} with damage: ${netDamage}, location: ${combatData.location}, specific: ${specificLocation} (Roll: ${locationRoll}), effect: ${effect}`);
        
        // Render the template and create the chat message
        const content = await renderTemplate("systems/witch-iron/templates/chat/injury-message.hbs", {
            attacker: combatData.attacker,
            defender: combatData.defender,
            location: combatData.location, // General location
            severity: netDamage, // Initial calculated net damage
            damage: netDamage, // Same as severity
            damageText: damageText, // Uses EFFECTIVE Bonus now
            soakText: soakText,     // Uses EFFECTIVE Bonus now
            weapon: weaponBonusMax || "-", // Keep Max weapon bonus for details section display
            soak: defenderAbilityBonus + armorBonusMax || 0, // Keep Max soak for details section display
            netHits: netHits,
            description: description,
            effect: effect,
            isDeflected: isDeflected,
            battleWear: battleWearDataForTemplate, // Battle wear data for the card controls
            abilityBonus: attackerAbilityBonus,
            weaponBonus: weaponBonus, // Pass effective bonus for calculation details
            armorBonus: armorBonus,   // Pass effective bonus for calculation details
            combatId: combatData.combatId,
            specificLocation: specificLocation, 
            locationRoll: locationRoll, 
            tooltipText: tooltipText 
        });
        
        // Create the chat message
        const message = await ChatMessage.create({
            user: game.user.id,
            content: content,
            speaker: ChatMessage.getSpeaker(),
            flavor: flavor,
            flags: {
                "witch-iron": {
                    messageType: messageType,
                    combatId: combatData.combatId,
                    injuryData: {
                        attacker: combatData.attacker,
                        defender: combatData.defender,
                        location: combatData.location,
                        damage: netDamage,
                        effect: effect,
                        netHits: netHits,
                        weaponDmg: weaponBonus,
                        abilityDmg: attackerAbilityBonus,
                        soak: defenderAbilityBonus + armorBonus,
                        abilitySoak: defenderAbilityBonus,
                        armorSoak: armorBonus,
                        combatId: combatData.combatId,
                        messageId: combatData.messageId,
                        preservedDamage: combatData.preserveDamage,
                        // Add specific location info to flags
                        specificLocation: game.witch?.currentInjury?.specificLocation || null,
                        locationRoll: game.witch?.currentInjury?.locationRoll || null
                    }
                }
            }
        });
        
        console.log(`Created injury message (${message.id}) for combat ID: ${combatData.combatId}`);
        
        // After message creation, we need to ensure event handlers are attached
        // This is executed on a slight delay to ensure the DOM is updated
        setTimeout(() => {
            // Use the new function to attach handlers
            attachInjuryMessageHandlers(message.id);
        }, 100);
        
        return message;
    }
    
    /**
     * Get battle wear data for attacker and defender
     * @param {string} attackerName Name of the attacker
     * @param {string} defenderName Name of the defender
     * @returns {object} Object containing battle wear data
     * @private
     */
    static async _getBattleWearData(attackerName, defenderName, location="torso") {
        // Find attacker and defender actors
        let attackerActor = null;
        let defenderActor = null;
        
        // Search in tokens first
        for (const token of canvas.tokens.placeables) {
            if (token.name === attackerName && token.actor) {
                attackerActor = token.actor;
            }
            if (token.name === defenderName && token.actor) {
                defenderActor = token.actor;
            }
            
            // If we found both, stop searching
            if (attackerActor && defenderActor) break;
        }
        
        // If not found in tokens, look in actors directory
        if (!attackerActor) {
            attackerActor = game.actors.find(a => a.name === attackerName);
        }
        if (!defenderActor) {
            defenderActor = game.actors.find(a => a.name === defenderName);
        }
        
        // Default battle wear data object also holds actor refs
        const locMap = { head: 'head', torso: 'torso', 'left-arm': 'leftArm', 'right-arm': 'rightArm', 'left-leg': 'leftLeg', 'right-leg': 'rightLeg' };
        const normalizedLocation = String(location).toLowerCase().replace(/\s+/g, '-');
        const locKey = locMap[normalizedLocation] || normalizedLocation;

        const returnData = {
            actors: {
                attacker: attackerActor, // Store found attacker actor (or null)
                defender: defenderActor  // Store found defender actor (or null)
            },
            attacker: {
                maxWear: 0, // This will now be REMAINING wear capacity for the card
                weaponBonus: 0, // Effective bonus (max - current wear)
                currentWear: 0, // Interaction wear (starts at 0 on the card)
                tokenImg: "icons/svg/mystery-man.svg",
                actualWear: 0 // Current wear on the actor's sheet
            },
            defender: {
                maxWear: 0, // This will now be REMAINING wear capacity for the card
                armorBonus: 0, // Effective bonus (max - current wear)
                currentWear: 0, // Interaction wear (starts at 0 on the card)
                tokenImg: "icons/svg/mystery-man.svg",
                actualWear: 0 // Current wear on the actor's sheet
            }
        };
        
        // If we found the attacker, get their weapon bonus and token image
        if (attackerActor) {
            // Get weapon bonus and battle wear from the actor's derived data
            if (attackerActor.system?.derived) {
                const actorWeaponWear = attackerActor.system.battleWear?.weapon?.value || 0;
                const actorWeaponMax = attackerActor.system.derived.weaponBonusMax || 0;
                const effectiveWeaponBonus = attackerActor.system.derived.weaponBonusEffective || 0;
                
                // Calculate REMAINING wear capacity for the card controls
                returnData.attacker.maxWear = Math.max(0, actorWeaponMax - actorWeaponWear); 
                returnData.attacker.weaponBonus = effectiveWeaponBonus; // Store effective bonus
                returnData.attacker.currentWear = 0; // Start card interaction wear at 0
                returnData.attacker.actualWear = actorWeaponWear; // Store actor's current wear

                console.log(`Attacker ${attackerName}: Max Bonus=${actorWeaponMax}, Current Wear=${actorWeaponWear}, Remaining Card MaxWear=${returnData.attacker.maxWear}, Effective Bonus=${effectiveWeaponBonus}`);

            } else {
                 // Fallback logic
                 const equippedWeapon = attackerActor.items.find(i => i.type === "weapon" && i.system.equipped);
                 if (equippedWeapon) {
                     const weaponBonus = parseInt(equippedWeapon.system.damage?.bonus) || 0;
                     returnData.attacker.maxWear = weaponBonus; // Fallback: Max wear is total bonus
                     returnData.attacker.weaponBonus = weaponBonus; // Fallback: Effective is total bonus
                 }
            }
            
            // Get token image
            if (attackerActor.token) {
                returnData.attacker.tokenImg = attackerActor.token.texture?.src || attackerActor.token.img || attackerActor.prototypeToken?.texture?.src || attackerActor.img;
            } else if (attackerActor.prototypeToken) {
                returnData.attacker.tokenImg = attackerActor.prototypeToken.texture?.src || attackerActor.img;
            } else {
                returnData.attacker.tokenImg = attackerActor.img;
            }
        }
        
        // If we found the defender, get their armor bonus and token image
        if (defenderActor) {
            // Get armor bonus and battle wear from the actor's derived data
            if (defenderActor.system?.derived) {
                const actorArmorWear = defenderActor.system.battleWear?.armor?.[locKey]?.value || 0;
                const actorArmorMax = defenderActor.system.derived.armorBonusMax || 0;
                const effectiveArmorBonus = defenderActor.system.derived.armorBonusEffective?.[locKey] || 0;
                
                // Calculate REMAINING wear capacity for the card controls
                returnData.defender.maxWear = Math.max(0, actorArmorMax - actorArmorWear);
                returnData.defender.armorBonus = effectiveArmorBonus; // Store effective bonus
                returnData.defender.currentWear = 0; // Start card interaction wear at 0
                returnData.defender.actualWear = actorArmorWear; // Store actor's current wear
                returnData.defender.location = locKey;
                
                console.log(`Defender ${defenderName}: Max Bonus=${actorArmorMax}, Current Wear=${actorArmorWear}, Remaining Card MaxWear=${returnData.defender.maxWear}, Effective Bonus=${effectiveArmorBonus}`);

            } else {
                 // Fallback logic
                 const equippedArmor = defenderActor.items.find(i => i.type === "armor" && i.system.equipped);
                 if (equippedArmor) {
                     const armorBonus = parseInt(equippedArmor.system.soak?.bonus) || 0;
                     returnData.defender.maxWear = armorBonus; // Fallback: Max wear is total bonus
                     returnData.defender.armorBonus = armorBonus; // Fallback: Effective is total bonus
                     returnData.defender.location = locKey;
                 }
            }
            
            // Get token image
            if (defenderActor.token) {
                returnData.defender.tokenImg = defenderActor.token.texture?.src || defenderActor.token.img || defenderActor.prototypeToken?.texture?.src || defenderActor.img;
            } else if (defenderActor.prototypeToken) {
                returnData.defender.tokenImg = defenderActor.prototypeToken.texture?.src || defenderActor.img;
            } else {
                returnData.defender.tokenImg = defenderActor.img;
            }
        }
        
        return returnData; // Return the object containing actors and battle wear data
    }
    
    /**
     * Create an injury item on the defender
     * @param {Actor} defenderActor The defender actor
     * @param {string} injuryName Name of the injury
     * @param {string} location Hit location
     * @param {number} damage Amount of damage
     * @param {string} injuryEffect Effect of the injury
     * @private
     */
    static async _createInjuryItem(defenderActor, injuryName, location, damage, injuryEffect) {
        // Check if we have a current detailed injury
        let specificLocation = location;
        if (game.witch?.currentInjury?.specificLocation) {
            specificLocation = `${game.witch.currentInjury.specificLocation} (${location})`;
        }
        
        // Parse the injuryEffect to extract individual conditions and required treatment
        const parts = (injuryEffect || "").split("|");
        const conditions = [];
        let sheetMedOption = 'none';
        for (let part of parts) {
          // Take the substring after the last comma (or full if none)
          const afterComma = part.includes(',') ? part.slice(part.lastIndexOf(',') + 1) : part;
          let condStr = afterComma.trim();
          // Detect treatment footnotes '*' = aid, '‡' = surgery
          let foot = condStr.endsWith('*') ? '*' : condStr.endsWith('‡') ? '‡' : '';
          if (foot === '*') sheetMedOption = sheetMedOption === 'surgery' ? 'surgery' : 'aid';
          else if (foot === '‡') sheetMedOption = 'surgery';
          condStr = condStr.replace(/[*‡]$/, '').trim();
          // Split name and rating
          const match = condStr.match(/^(.+?)\s*(\d+)?$/);
          if (!match) continue;
          const type = match[1].toLowerCase().replace(/ /g, '');
          const rating = match[2] ? parseInt(match[2]) : null;
          conditions.push({ type, rating });
        }
        // Calculate treatment difficulty based on medical option and damage
        let treatmentDifficulty = 1;
        if (sheetMedOption === 'aid') treatmentDifficulty = Math.floor(damage / 2) || 1;
        else if (sheetMedOption === 'surgery') treatmentDifficulty = damage;
        // Derive the dropdown key from the specific location label
        const locationKey = specificLocation.replace(/\s*\(.*\)/, "")
          .split('/')[0]
          .toLowerCase()
          .replace(/\s+/g, "");
        // Build the system data for the new injury item
        const trimmedEffect = HitLocationSelector._trimEffectName(injuryEffect);
        const system = {
          description: `Injury to the ${specificLocation} with ${damage} damage.`,
          // Use the specific injury key so the dropdown selects the exact location
          location: locationKey,
          severity: { value: damage, label: damage < 4 ? "Minor" : damage < 7 ? "Major" : "Severe" },
          effect: trimmedEffect,
          conditions,
          medicalOption: sheetMedOption,
          treatmentDifficulty,
          treatmentNotes: "",
          isStabilized: false
        };
        // Create the new injury item data
        const injuryData = {
          name: injuryName,
          type: "injury",
          img: "icons/svg/blood.svg",
          system
        };
        
        // Create the injury on the defender
        await defenderActor.createEmbeddedDocuments("Item", [injuryData]);
    }

    /**
     * Generate a description for an injury based on location and severity
     * @param {string} location The hit location
     * @param {number} severity The severity level
     * @returns {string} A descriptive name for the injury
     * @private
     */
    static _generateInjuryDescription(location, severity, effect = null) {
        if (severity === 0) {
            return `Attack Deflected by ${location}`;
        }

        // If an effect is provided, use the first part as the injury name
        if (effect) {
            let base = effect.split('|')[0];
            base = base.split(',')[0];
            base = base.replace(/[*‡]/g, '').trim();
            return `${base} ${location}`;
        }

        let severityLabel = "Minor";
        if (severity >= 7) {
            severityLabel = "Severe";
        } else if (severity >= 4) {
            severityLabel = "Major";
        }

        return `${severityLabel} ${location} Injury`;
    }

    /**
     * Roll on a specific injury table for a detailed hit location
     * @param {string} generalLocation The general hit location (head, torso, arm, leg)
     * @param {number|null} roll Optional d10 roll (if null, a random roll will be made)
     * @returns {Object} The detailed injury information
     */
    static rollDetailedHitLocation(generalLocation, roll = null) {
        // Normalize the location name to match our table keys
        const normalizedLocation = generalLocation.toLowerCase().replace(/\s+/g, '');
        let baseLocation;
        
        // Map the general location to our table keys
        if (normalizedLocation.includes('head')) {
            baseLocation = 'head';
        } else if (normalizedLocation.includes('torso')) {
            baseLocation = 'torso';
        } else if (normalizedLocation.includes('arm')) {
            baseLocation = 'arm';
        } else if (normalizedLocation.includes('leg')) {
            baseLocation = 'leg';
        } else {
            // If we don't have a specific table, return null
            return null;
        }
        
        // Roll on the appropriate table
        return rollOnInjuryTable(baseLocation, roll);
    }
}

// Function to handle chat message rendering
function onChatMessageRendered(message, html, data) {
    console.log("renderChatMessage hook called for message:", message.id);
    
    // Check if the message has the witch-iron flags
    const quarrelData = message.getFlag("witch-iron", "quarrelData");
    if (quarrelData) {
        console.log("Message has witch-iron quarrelData:", quarrelData);
    } else {
        console.log("Message does NOT have witch-iron quarrelData");
    }
    
    // Find all hit location buttons in the message
    const hitLocationButtons = html.find('.choose-hit-location');
    console.log(`Found ${hitLocationButtons.length} hit location buttons in message ${message.id}`);
    
    // Attach click handlers to hit location buttons
    hitLocationButtons.on('click', async (event) => {
        event.preventDefault();
        console.log("Hit location button clicked!");
        
        // Get the data attributes from the button
        const button = event.currentTarget;
        const attacker = button.dataset.attacker;
        const defender = button.dataset.defender;
        const damage = parseInt(button.dataset.damage) || 0;
        const originalDamage = parseInt(button.dataset.originalDamage) || damage;
        const messageId = button.dataset.messageid; // Note: dataset property names are lowercased
        
        // Get additional data attributes for proper damage calculation
        const weaponDmg = parseInt(button.dataset.weapondmg) || 0;
        const soak = parseInt(button.dataset.soak) || 0;
        
        // Ensure netHits is properly parsed as a number and get absolute value
        // netHits may be negative in the quarrel but we need a positive value for damage calculation
        const netHits = Math.abs(parseInt(button.dataset.nethits) || 0); 
        
        console.log(`Button click - parsed net hits: ${netHits} (from "${button.dataset.nethits}")`);
        console.log(`Additional data from button: weaponDmg=${weaponDmg}, soak=${soak}`);
        
        // Generate a unique combat ID for this workflow
        const combatId = HitLocationSelector.generateCombatId();
        console.log(`Generated new combat ID for hit location workflow: ${combatId}`);
        
        console.log("Button data attributes:", {
            attacker,
            defender,
            damage,
            originalDamage,
            messageId,
            netHits,
            weaponDmg,
            soak,
            combatId
        });
        
        // Try to retrieve the original quarrel message to get complete data
        const originalMessage = game.messages.get(messageId);
        const quarrelData = originalMessage?.getFlag("witch-iron", "quarrelData");
        
        if (quarrelData) {
            console.log("Retrieved original quarrel data:", quarrelData);
        }
        
        console.log(`Opening hit location dialog with ${netHits} net hits and original damage ${originalDamage} (combat ID: ${combatId})`);
        
        // Open the hit location selector dialog
        HitLocationSelector.openDialog({
            attacker,
            defender,
            damage: originalDamage,  // Use the original damage value
            messageId,
            netHits,
            weaponDmg,  // Pass weapon damage
            soak,       // Pass soak value
            combatId,
            preserveDamage: false,  // CHANGED: Force recalculation of damage with proper formula
            quarrelData  // Pass the original quarrel data if available
        });
    });
}

// Register the chat message hook with a named function
Hooks.on("renderChatMessage", onChatMessageRendered);

// Socket event listener for battle wear updates
Hooks.once("ready", () => {
    // Set up socket event listener for completed battle wear updates
    game.socket.on("system.witch-iron.battleWearUpdate", (data) => {
        // This only handles completed updates from the GM
        if (!data.completed) return;
        
        console.log("Received completed battle wear update via socket:", data);
        
        // Don't process our own updates if we're the GM who sent it
        if (game.user.isGM && data.userId === game.user.id) {
            console.log("Ignoring our own update");
            return;
        }
        
        // Find the message element in the DOM
        const messageElement = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
        if (!messageElement) {
            console.warn(`Could not find message element for ID ${data.messageId}`);
            return;
        }
        
        // Extra debug for battle wear updates with specific focus on 0 armor battle wear
        if (data.attackerWear > 0 && data.defenderWear === 0) {
            console.log("[DEBUG SOCKET] Processing a weapon-only battle wear update:", data);
            
            // Log injury content before update
            const injuryElement = messageElement.querySelector('.injury-row .severity-col');
            if (injuryElement) {
                console.log(`[DEBUG SOCKET] Current injury severity before update: ${injuryElement.textContent}`);
            }
        }
        
        // Update the UI
        updateBattleWearUI(messageElement, data.attackerWear, data.defenderWear);
        
        // Double-check the update was applied correctly
        setTimeout(() => {
            const injuryElement = messageElement.querySelector('.injury-row .severity-col');
            if (injuryElement) {
                console.log(`[DEBUG SOCKET] Injury severity after update: ${injuryElement.textContent}`);
            }
        }, 100);
    });
});

/**
 * Updates the battle wear UI with new values
 * @param {HTMLElement} messageElement - The message element to update
 * @param {number} attackerWear - New attacker wear value
 * @param {number} defenderWear - New defender wear value
 */
function updateBattleWearUI(messageElement, attackerWear, defenderWear) {
    console.log(`Updating battle wear UI: Attacker: ${attackerWear}, Defender: ${defenderWear}`);
    
    // Update wear values in UI
    const attackerWearEl = messageElement.querySelector('.attacker-wear .battle-wear-value');
    const defenderWearEl = messageElement.querySelector('.defender-wear .battle-wear-value');
    
    if (attackerWearEl) attackerWearEl.textContent = attackerWear;
    if (defenderWearEl) defenderWearEl.textContent = defenderWear;
    
    // Also update the displayed bonus values (the +# Damage / +#d6 Soak text)
    const attackerBonusEl = messageElement.querySelector('.attacker-wear .battle-wear-bonus');
    const defenderBonusEl = messageElement.querySelector('.defender-wear .battle-wear-bonus');
    if (attackerBonusEl) attackerBonusEl.textContent = attackerWear;
    if (defenderBonusEl) defenderBonusEl.textContent = defenderWear;
    
    // Show/hide tabs based on defender wear
    const injuryHeader = messageElement.querySelector('.injury-header');
    const damageTabs = messageElement.querySelector('.damage-calc-tabs');
    
    if (injuryHeader) {
        if (defenderWear > 0 && !damageTabs) {
            // Create tabs if needed
            const tabsDiv = document.createElement('div');
            tabsDiv.className = 'damage-calc-tabs';
            tabsDiv.innerHTML = `
                <button class="damage-tab" data-tab="min">Min</button>
                <button class="damage-tab active" data-tab="avg">Avg</button>
                <button class="damage-tab" data-tab="max">Max</button>
            `;
            injuryHeader.appendChild(tabsDiv);
            
            // Attach handlers to the new tabs
            const newTabs = tabsDiv.querySelectorAll('.damage-tab');
            newTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const allTabs = messageElement.querySelectorAll('.damage-tab');
                    allTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    updateInjuryDisplayForTab(messageElement, tab.dataset.tab);
                });
            });
        } else if (defenderWear === 0 && damageTabs) {
            // Remove tabs if needed
            injuryHeader.removeChild(damageTabs);
        }
    }
    
    // Remove any processing indicators
    const processingIndicator = messageElement.querySelector('.battle-wear-processing');
    if (processingIndicator) {
        processingIndicator.remove();
    }
    
    // Update button states
    updateBattleWearButtons(messageElement);
    
    // Always update the injury display, whether armor battle wear is present or not
    // When defenderWear is 0, use 'avg' as the tab type (doesn't matter since there are no tabs)
    updateInjuryDisplayForTab(messageElement, defenderWear > 0 ? 
        (messageElement.querySelector('.damage-tab.active')?.dataset?.tab || 'avg') : 'avg');
}

/**
 * Apply battle wear to the attacker's weapon and defender's armor
 * @param {ChatMessage} message The chat message with battle wear
 * @param {number} attackerWearToAdd Amount of battle wear *added* in this interaction (from card)
 * @param {number} defenderWearToAdd Amount of battle wear *added* in this interaction (from card)
 */
async function applyBattleWear(message, attackerWearToAdd, defenderWearToAdd, location="torso") {
    try {
        // Log the battle wear application request
        console.log(`Applying battle wear ADDITION: Attacker +${attackerWearToAdd}, Defender +${defenderWearToAdd}`);
        console.log("Message object:", message);

        // Input validation
        if (!message) {
            console.warn("No message provided to applyBattleWear");
            ui.notifications.warn("Could not apply battle wear: No message provided");
            return;
        }

        // Convert wear values to numbers and ensure they're non-negative
        attackerWearToAdd = Math.max(0, parseInt(attackerWearToAdd) || 0);
        defenderWearToAdd = Math.max(0, parseInt(defenderWearToAdd) || 0);

        // Normalize the location string to match actor data keys
        // e.g. "left arm" -> "leftArm"
        const locMap = {
            head: "head",
            torso: "torso",
            "left-arm": "leftArm",
            "right-arm": "rightArm",
            "left-leg": "leftLeg",
            "right-leg": "rightLeg"
        };
        const normalizedLocation = String(location).toLowerCase().replace(/\s+/g, "-");
        const locKey = locMap[normalizedLocation] || normalizedLocation;

        // If both wear values are 0, nothing to add
        if (attackerWearToAdd === 0 && defenderWearToAdd === 0) {
            console.log("No battle wear to add in this interaction");
            // Still update the flag to store the '0' values for this interaction if needed
            await message.update({
                "flags.witch-iron.battleWear": {
                    attacker: attackerWearToAdd,
                    defender: defenderWearToAdd,
                    location: locKey
                }
            });
            // Emit update so UI processing indicators are removed etc.
            if (game.socket) {
                game.socket.emit("system.witch-iron.battleWearUpdate", {
                    messageId: message.id,
                    attackerWear: attackerWearToAdd,
                    defenderWear: defenderWearToAdd,
                    location: locKey,
                    userId: game.user.id,
                    completed: true
                });
            }
            return true; // Return true as technically nothing failed
        }

        // Initialize variables for attacker and defender names
        let attackerName = "Attacker";
        let defenderName = "Defender";

        // ... (rest of the name finding logic remains the same) ...
        // Try to get the message element
        let messageElement = null;
        
        // First try the message.element property
        if (message.element) {
            messageElement = message.element;
            console.log("Found message element via message.element property");
        }
        // Then try jQuery to find it by message ID
        else if (message.id) {
            const $messageHtml = $(`.message[data-message-id="${message.id}"]`);
            if ($messageHtml.length > 0) {
                messageElement = $messageHtml[0];
                console.log("Found message element via jQuery selector");
            }
        }
        // Last resort - try to parse the content
        else if (message.content) {
            console.log("Trying to get actor names from message content");
            // This will be handled below
        }
        
        // Methods to get actor names - try each until we find one that works
        const methods = [
            // Method 1: From message element selectors
            () => {
                if (!messageElement) return false;
                
                const attackerEl = messageElement.querySelector('.combatant.attacker .token-name');
                const defenderEl = messageElement.querySelector('.combatant.defender .token-name');
                
                if (attackerEl && defenderEl) {
                    attackerName = attackerEl.textContent.trim();
                    defenderName = defenderEl.textContent.trim();
                    console.log(`Found names in message element - Attacker: "${attackerName}", Defender: "${defenderName}"`);
                    return true;
                }
                return false;
            },
            
            // Method 2: From message flags
            () => {
                const messageData = message?.getFlag?.("witch-iron", "injuryData");
                if (messageData) {
                    if (messageData.attacker) attackerName = messageData.attacker;
                    if (messageData.defender) defenderName = messageData.defender;
                    console.log(`Found names in message flags - Attacker: "${attackerName}", Defender: "${defenderName}"`);
                    return true;
                }
                return false;
            },
            
            // Method 3: From jQuery parsing the message content
            () => {
                if (!message.content) return false;
                
                const $content = $(message.content);
                const $attackerName = $content.find('.combatant.attacker .token-name');
                const $defenderName = $content.find('.combatant.defender .token-name');
                
                if ($attackerName.length && $defenderName.length) {
                    attackerName = $attackerName.text().trim();
                    defenderName = $defenderName.text().trim();
                    console.log(`Found names in message content - Attacker: "${attackerName}", Defender: "${defenderName}"`);
                    return true;
                }
                return false;
            },
            
            // Method 4: From regex parsing the raw content
            () => {
                if (!message.content) return false;
                
                // Use regex to try to extract names from HTML content
                const attackerRegex = /class="(?:.*?)attacker(?:.*?)"[\s\S]*?class="token-name"[^>]*>(.*?)</i;
                const defenderRegex = /class="(?:.*?)defender(?:.*?)"[\s\S]*?class="token-name"[^>]*>(.*?)</i;
                
                const attackerMatch = message.content.match(attackerRegex);
                const defenderMatch = message.content.match(defenderRegex);
                
                if (attackerMatch && attackerMatch[1]) attackerName = attackerMatch[1].trim();
                if (defenderMatch && defenderMatch[1]) defenderName = defenderMatch[1].trim();
                
                if (attackerMatch || defenderMatch) {
                    console.log(`Found names via regex - Attacker: "${attackerName}", Defender: "${defenderName}"`);
                    return true;
                }
                return false;
            }
        ];
        
        // Try each method until we find actor names
        let foundNames = false;
        for (const method of methods) {
            foundNames = method();
            if (foundNames) break;
        }
        
        if (!foundNames) {
            console.warn("Could not find actor names, using defaults");
        }
        
        console.log(`Using names - Attacker: "${attackerName}", Defender: "${defenderName}"`);
        
        // Find the attacker and defender actors
        let attackerActor = null;
        let defenderActor = null;
        
        // Function to find an actor by name
        const findActor = (name) => {
            // First check tokens
            let actor = null;
            for (const token of canvas.tokens.placeables) {
                if (token.name === name && token.actor) {
                    actor = token.actor;
                    console.log(`Found actor in tokens: ${token.name}`);
                    break;
                }
            }
            
            // If not found in tokens, check actors directory
            if (!actor) {
                actor = game.actors.find(a => a.name === name);
                if (actor) {
                    console.log(`Found actor in directory: ${actor.name}`);
                }
            }
            
            return actor;
        };
        
        // Find the actors
        attackerActor = findActor(attackerName);
        defenderActor = findActor(defenderName);
        
        if (!attackerActor) {
            console.warn(`Could not find attacker actor: ${attackerName}`);
        }
        
        if (!defenderActor) {
            console.warn(`Could not find defender actor: ${defenderName}`);
        }

        // Store the battle wear ADDED in this interaction in the message flags
        await message.update({
            "flags.witch-iron.battleWear": {
                attacker: attackerWearToAdd,
                defender: defenderWearToAdd,
                location: locKey
            }
        });
        console.log(`Stored interaction wear (+${attackerWearToAdd}, +${defenderWearToAdd}) in message flags.`);

        // --- Calculate and Update Actor Data ---
        let newTotalAttackerWear = 0;
        let newTotalDefenderWear = 0;

        if (attackerActor) {
            const currentAttackerWear = attackerActor.system.battleWear?.weapon?.value || 0;
            const attackerMaxWear = attackerActor.system.derived?.weaponBonusMax || 0;
            newTotalAttackerWear = Math.min(currentAttackerWear + attackerWearToAdd, attackerMaxWear);

            console.log(`Updating ${attackerName}'s weapon wear: ${currentAttackerWear} + ${attackerWearToAdd} -> ${newTotalAttackerWear} (Max: ${attackerMaxWear})`);
            await attackerActor.update({ "system.battleWear.weapon.value": newTotalAttackerWear });

            const weaponItem = attackerActor.items.find(i => i.type === 'weapon' && i.system.equipped);
            if (weaponItem) {
                await weaponItem.update({ "system.wear.value": newTotalAttackerWear });
            }
        }

        if (defenderActor) {
            const currentDefenderWear = defenderActor.system.battleWear?.armor?.[locKey]?.value || 0;
            const defenderMaxWear = defenderActor.system.derived?.armorBonusMax || 0;
            newTotalDefenderWear = Math.min(currentDefenderWear + defenderWearToAdd, defenderMaxWear);

            console.log(`Updating ${defenderName}'s armor wear: ${currentDefenderWear} + ${defenderWearToAdd} -> ${newTotalDefenderWear} (Max: ${defenderMaxWear})`);
            const updateObj = {};
            updateObj[`system.battleWear.armor.${locKey}.value`] = newTotalDefenderWear;
            await defenderActor.update(updateObj);

            const armorItem = defenderActor.items.find(i => i.type === 'armor' && i.system.equipped && i.system.locations?.[locKey]);
            if (armorItem) {
                const prot = Number(armorItem.system.protection?.value || 0);
                const wearVal = Math.min(newTotalDefenderWear, prot);
                const upd = {}; upd[`system.wear.${locKey}.value`] = wearVal;
                let name = armorItem.name;
                const destroyed = Object.entries(armorItem.system.locations || {}).every(([l,en]) => {
                    if (!en) return true;
                    const w = l===locKey ? wearVal : Number(armorItem.system.wear?.[l]?.value || 0);
                    return w >= prot;
                });
                if (destroyed && !name.startsWith('(Destroyed) ')) name = `(Destroyed) ${name}`;
                if (!destroyed && name.startsWith('(Destroyed) ')) name = name.replace(/^\(Destroyed\)\s*/, '');
                upd.name = name;
                await armorItem.update(upd);
            }

            if (defenderActor.sheet && typeof defenderActor.sheet._syncActorWearFromItems === 'function') {
                defenderActor.sheet._syncActorWearFromItems();
                if (defenderActor.sheet._updateArmorTotals)
                    await defenderActor.sheet._updateArmorTotals();
            }
        }

        // Broadcast a custom socket message to notify all clients about the battle wear change *in this interaction*
        // The UI update function will handle displaying these interaction values correctly on the card.
        if (game.socket) {
            game.socket.emit("system.witch-iron.battleWearUpdate", {
                messageId: message.id,
                attackerWear: attackerWearToAdd,
                defenderWear: defenderWearToAdd,
                location: locKey,
                userId: game.user.id,
                completed: true
            });
            console.log(`Broadcast interaction wear update (+${attackerWearToAdd}, +${defenderWearToAdd})`);
        }

        return true;
    } catch (error) {
        console.error("Error applying battle wear:", error);
        ui.notifications.error("Failed to apply battle wear: " + error.message);
        return false;
    }
}

/**
 * Helper function to refresh an actor's sheet battle wear display
 * @param {Actor} actor The actor whose sheet needs refreshing
 * @return {boolean} Whether the sheet was found and refreshed
 */
function refreshActorSheet(actor) {
    // Check if the actor has an open sheet
    const sheet = actor.sheet;
    console.log(`Refreshing sheet for ${actor.name}:`, sheet);
    
    if (!sheet?.rendered) {
        console.log(`Sheet for ${actor.name} is not rendered, returning false`);
        return false;
    }
    
    // If it's a WitchIronMonsterSheet, call the _updateBattleWearDisplays method
    if (sheet._updateBattleWearDisplays && typeof sheet._updateBattleWearDisplays === 'function') {
        console.log(`Calling _updateBattleWearDisplays for ${actor.name}`);
        console.group(`Updating battle wear displays for ${actor.name}`);
        
        // Add some extra debug logging to the battle wear data
        const weaponWear = actor.system.battleWear?.weapon?.value || 0;
        const armorWear = actor.system.battleWear?.armor?.value || 0;
        console.log(`Current battle wear values - Weapon: ${weaponWear}, Armor: ${armorWear}`);
        console.log(`Actor's full battleWear data:`, actor.system.battleWear);
        
        sheet._updateBattleWearDisplays();
        console.log("Battle wear displays updated successfully");
        console.groupEnd();
        return true;
    } else {
        // If it's not the right sheet type, fully re-render
        console.log(`Sheet doesn't have _updateBattleWearDisplays method, doing full render for ${actor.name}`);
        sheet.render(true);
        return true;
    }
    
    return false;
}

// Helper function to update injury button text
function updateInjuryButtonText(messageElement, defender) {
    if (!messageElement) return;
    
    // Try to get the defender wear value safely
    let defenderWearValue = 0;
    const defenderWearElement = messageElement.querySelector('.defender-wear .battle-wear-value');
    if (defenderWearElement) {
        defenderWearValue = parseInt(defenderWearElement.textContent) || 0;
    }
    
    // Find the injury button with the matching defender
    const injuryButton = messageElement.querySelector(`.create-injury[data-defender="${defender}"]`);
    
    if (injuryButton) {
        if (defenderWearValue > 0) {
            injuryButton.innerHTML = `<i class="fas fa-plus-circle"></i> Roll Battle Wear & Injury for ${defender}`;
        } else {
            injuryButton.innerHTML = `<i class="fas fa-plus-circle"></i> Add Injury to ${defender}`;
        }
    }
}

/**
 * Dialog to select a hit location
 */
export class HitLocationDialog extends Application {
    constructor(data={}, options={}) {
        super(options);
        this.data = data;
        this.selectedLocation = null;
        this.phase = "defender"; // defender or attacker
        this.moveHistory = [];
        
        // Ensure netHits is properly parsed as a number
        this.netHits = parseInt(data.netHits) || 0;
        this.remainingHits = this.netHits;
        this.weaponDamage = data.weaponDamage || 0;
        this.soakValues = data.soakValues || {};
        this.armorValues = data.armorValues || {};
        this.locations = data.locations || ["head","torso","left-arm","right-arm","left-leg","right-leg"];
        this.defenderImg = data.defenderImg || "icons/svg/mystery-man.svg";
        
        console.log(`HitLocationDialog initialized with netHits: ${this.netHits}, remaining: ${this.remainingHits}`);
        
        // Define adjacency map (which locations can be moved between)
        this.adjacencyMap = {
            'head': ['torso'],
            'torso': ['head', 'left-arm', 'right-arm', 'left-leg', 'right-leg'],
            'left-arm': ['torso'],
            'right-arm': ['torso'],
            'left-leg': ['torso'],
            'right-leg': ['torso']
        };
        
        // Movement cost
        this.moveCost = 2;
        
        console.log("HitLocationDialog created with data:", this.data);
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "hit-location-dialog",
            title: "Select Hit Location",
            template: "systems/witch-iron/templates/dialogs/hit-location-selector.hbs",
            width: 400,
            height: 600,
            classes: ["witch-iron", "hit-location-dialog", "defender-mode"],
            resizable: true
        });
    }
    
    /** @override */
    getData(options={}) {
        const damage = this.weaponDamage + this.remainingHits;
        const locationData = {};
        const map = { 'head':'head','torso':'torso','left-arm':'leftArm','right-arm':'rightArm','left-leg':'leftLeg','right-leg':'rightLeg' };
        for (const loc of this.locations) {
            const key = map[loc] || loc;
            const soak = this.soakValues[key] || 0;
            const armor = this.armorValues[key] || 0;
            const net = Math.max(0, damage - soak);
            locationData[loc] = { soak, armor, net };
        }

        const limbLoss = { leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 };
        const defender = game.actors?.getName?.(this.data.defenderName) || null;
        if (defender) {
            for (const item of defender.items) {
                if (item.type !== 'injury') continue;
                const effect = (item.system?.effect || '').toLowerCase();
                const desc = (item.system?.description || '').toLowerCase();
                const name = (item.name || '').toLowerCase();
                const loc = (item.system?.location || '').toLowerCase();
                const side =
                    loc.includes('left') || name.includes('left') || desc.includes('left') ? 'left' :
                    loc.includes('right') || name.includes('right') || desc.includes('right') ? 'right' : null;

                let amt = 0;
                let limb = null;
                if (effect.includes('hand') || name.includes('hand') || desc.includes('hand')) {
                    amt = 0.25; limb = 'arm';
                }
                if (effect.includes('foot') || name.includes('foot') || desc.includes('foot')) {
                    amt = 0.25; limb = 'leg';
                }
                if (effect.includes('forearm') || name.includes('forearm') || desc.includes('forearm')) {
                    amt = Math.max(amt, 0.5); limb = 'arm';
                }
                if (effect.includes('shin') || name.includes('shin') || desc.includes('shin')) {
                    amt = Math.max(amt, 0.5); limb = 'leg';
                }
                if (effect.includes('arm') || name.includes('arm') || desc.includes('arm')) {
                    amt = Math.max(amt, 1); limb = 'arm';
                }
                if (effect.includes('leg') || name.includes('leg') || desc.includes('leg')) {
                    amt = Math.max(amt, 1); limb = 'leg';
                }
                if (amt === 0 || !limb) continue;
                if (side === 'left') {
                    limbLoss[limb === 'arm' ? 'leftArm' : 'leftLeg'] = Math.max(limbLoss[limb === 'arm' ? 'leftArm' : 'leftLeg'], amt);
                } else if (side === 'right') {
                    limbLoss[limb === 'arm' ? 'rightArm' : 'rightLeg'] = Math.max(limbLoss[limb === 'arm' ? 'rightArm' : 'rightLeg'], amt);
                } else {
                    const armKey = limb === 'arm' ? ['leftArm','rightArm'] : ['leftLeg','rightLeg'];
                    for (const k of armKey) limbLoss[k] = Math.max(limbLoss[k], amt);
                }
            }
        }
        const limbLossClass = {};
        for (const [k,v] of Object.entries(limbLoss)) {
            limbLossClass[k] = v >= 1 ? 'missing-100' : v >= 0.5 ? 'missing-50' : v >= 0.25 ? 'missing-25' : '';
        }
        return {
            defenderName: this.data.defenderName || "Target",
            defenderImg: this.defenderImg,
            damageAmount: this.data.damageAmount || 0,
            netHits: this.netHits,
            damagePreview: damage,
            phase: this.phase,
            locations: locationData,
            limbLossClass
        };
    }

    /**
     * Move to the attacker phase where they can spend net hits to adjust location
     * @param {string} initialLocation The initially selected location
     */
    moveToAttackerPhase(initialLocation) {
        console.log("Moving to attacker phase");
        this.phase = "attacker";
        this.element.removeClass('defender-mode').addClass('attacker-mode');
        
        // Hide defender phase elements
        this.element.find('.defender-phase').hide();
        this.element.find('.defender-buttons').hide();
        
        // Show attacker phase elements
        this.element.find('.attacker-phase').show();
        this.element.find('.attacker-buttons').show();
        
        // Update the title to make it clear we're in adjustment phase
        this.element.find('h2').text("Adjust Hit Location");
        
        // Update the selected location display
        const displayLocation = this.formatLocationName(initialLocation);
        this.element.find('#selected-location').text(displayLocation);
        
        // Update remaining net hits
        this.element.find('#net-hits-remaining').text(this.remainingHits);
        
        // Log current phase state
        console.log(`Attacker phase activated. Selected location: ${initialLocation}, net hits: ${this.netHits}, remaining: ${this.remainingHits}`);
        console.log("Visible elements check:", {
            attackerPhaseVisible: this.element.find('.attacker-phase').is(':visible'),
            attackerButtonsVisible: this.element.find('.attacker-buttons').is(':visible'),
            defenderPhaseHidden: !this.element.find('.defender-phase').is(':visible'),
            defenderButtonsHidden: !this.element.find('.defender-buttons').is(':visible')
        });
        
        // Force redraw of the UI
        this.element.find('.attacker-phase').css('display', 'block');
        this.element.find('.attacker-buttons').css('display', 'flex');
        
        // Update available move buttons
        this.updateAvailableMoves();

        // Update damage preview and soak display
        this.updateDamagePreview();
    }
    
    /**
     * Select a hit location in the defender phase
     * @param {string} location The location to select
     */
    selectLocation(location) {
        console.log(`Selecting location: ${location}, current phase: ${this.phase}, netHits: ${this.netHits}`);
        
        // Remove selected class from all labels and body parts
        const locationLabels = this.element.find('.location-label');
        locationLabels.removeClass('selected');
        
        const bodyParts = this.element.find('.body-part');
        bodyParts.removeClass('selected available');
        
        // Add selected class to clicked label and body part
        const selectedLabel = this.element.find(`.location-label[data-location="${location}"]`);
        selectedLabel.addClass('selected');
        
        const selectedPart = this.element.find(`.body-part[data-location="${location}"]`);
        selectedPart.addClass('selected');
        
        this.selectedLocation = location;

        this.updateDamagePreview();
        
        // Format the location name for display
        const displayLocation = this.formatLocationName(location);
        
        // If we're in defender phase, check if we should proceed to attacker phase
        if (this.phase === "defender") {
            console.log(`Defender phase completed with location: ${location}, netHits: ${this.netHits}`);
            
            if (this.netHits > 0) {
                console.log(`Moving to attacker phase with ${this.netHits} net hits available`);
            this.moveToAttackerPhase(location);
        } else {
            // If auto-apply is enabled and we're in defender phase without net hits, apply immediately
                console.log("No net hits available, applying hit immediately");
                if (this.data.autoApply) {
                this.applyHit(location);
                }
            }
        }
        
        console.log(`Location selected: ${displayLocation}`);
    }
    
    /**
     * Update which move buttons are available based on current location and remaining hits
     */
    updateAvailableMoves() {
        if (!this.selectedLocation) return;
        
        // Clear all available indicators
        const bodyParts = this.element.find('.body-part');
        bodyParts.removeClass('available');
        
        // Remove available indicators from labels
        const locationLabels = this.element.find('.location-label');
        locationLabels.removeClass('available');
        
        // Get adjacent locations
        const adjacentLocations = this.adjacencyMap[this.selectedLocation] || [];
        
        // Highlight adjacent locations if we have enough hits or they represent an undo move
        adjacentLocations.forEach(loc => {
            if (this.remainingHits >= this.moveCost || loc === this.moveHistory[this.moveHistory.length - 1]) {
                this.element.find(`.body-part[data-location="${loc}"]`).addClass('available');
                this.element.find(`.location-label[data-location="${loc}"]`).addClass('available');
            }
        });
    }
    
    /**
     * Move the hit location to a new location
     * @param {string} targetLocation The new location
     */
    moveLocation(targetLocation) {
        if (!this.selectedLocation) return;

        const adjacentLocations = this.adjacencyMap[this.selectedLocation] || [];
        const lastLocation = this.moveHistory[this.moveHistory.length - 1];

        // If clicking the previous location, treat as an undo even if no hits remain
        if (targetLocation === lastLocation) {
            this.moveHistory.pop();
            this.remainingHits = Math.min(this.netHits, this.remainingHits + this.moveCost);
            this.element.find('#net-hits-remaining').text(this.remainingHits);
            this.selectLocationInAttackerPhase(targetLocation);
            this.updateDamagePreview();
            return;
        }

        // Normal move requires adjacency and available hits
        if (!adjacentLocations.includes(targetLocation) || this.remainingHits < this.moveCost) {
            console.warn(`Invalid move from ${this.selectedLocation} to ${targetLocation}`);
            return;
        }

        // Record the move in history
        this.moveHistory.push(this.selectedLocation);

        this.remainingHits -= this.moveCost;
        this.element.find('#net-hits-remaining').text(this.remainingHits);
        this.selectLocationInAttackerPhase(targetLocation);
        this.updateDamagePreview();
    }
    
    /**
     * Select a location during the attacker phase
     * @param {string} location The new location
     */
    selectLocationInAttackerPhase(location) {
        // Remove selected and available classes from all body parts
        const bodyParts = this.element.find('.body-part');
        bodyParts.removeClass('selected available');
        
        // Remove selected from all labels
        const locationLabels = this.element.find('.location-label');
        locationLabels.removeClass('selected');
        
        // Add selected class to the new location elements
        const selectedPart = this.element.find(`.body-part[data-location="${location}"]`);
        selectedPart.addClass('selected');
        
        const selectedLabel = this.element.find(`.location-label[data-location="${location}"]`);
        selectedLabel.addClass('selected');
        
        // Update the selected location
        this.selectedLocation = location;

        // Update display
        const displayLocation = this.formatLocationName(location);
        this.element.find('#selected-location').text(displayLocation);

        this.updateDamagePreview();

        // Update available moves
        this.updateAvailableMoves();
    }
    
    /**
     * Format a location string for display
     * @param {string} location The location to format
     * @returns {string} The formatted location name
     */
    formatLocationName(location) {
        return location.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Update damage preview and soak text based on current state
     */
    updateDamagePreview() {
        const map = { 'head':'head','torso':'torso','left-arm':'leftArm','right-arm':'rightArm','left-leg':'leftLeg','right-leg':'rightLeg' };

        for (const loc of this.locations) {
            const key = map[loc] || loc;
            const soak = this.soakValues[key] || 0;
            let hits;
            let show = true;

            if (this.phase === 'defender') {
                hits = this.netHits;
            } else {
                if (loc === this.selectedLocation) {
                    hits = this.remainingHits;
                } else if ((this.adjacencyMap[this.selectedLocation] || []).includes(loc)) {
                    hits = Math.max(this.remainingHits - this.moveCost, 0);
                } else {
                    show = false;
                    hits = this.remainingHits;
                }
            }

            const damage = this.weaponDamage + hits;
            const net = Math.max(0, damage - soak);

            const value = show ? net : '';
            const display = value !== '' ? `Net Dmg: ${value}` : '';

            this.element.find(`.location-value[data-location="${loc}"] .net-dmg`).text(display);
            this.element.find(`.location-value[data-location="${loc}"] .soak`).text(this.soakValues[key] || 0);
            this.element.find(`.location-value[data-location="${loc}"] .armor`).text(this.armorValues[key] || 0);
        }
    }
    
    /**
     * Apply the hit with the selected location
     * @param {string} location Location to apply the hit to
     */
    applyHit(location) {
        console.log(`Applying hit to location: ${location}, remaining hits: ${this.remainingHits}, phase: ${this.phase}`);
        
        if (this.data.applyHitCallback) {
            // Log detailed information for debugging
            console.log(`Calling applyHitCallback with location "${location}" and remaining hits: ${this.remainingHits}`);
            console.log(`Hit data: attacker=${this.data.attacker}, defender=${this.data.defender}, damage=${this.data.damageAmount}`);
            
            // Pass the remaining net hits to the callback
            this.data.applyHitCallback(location, this.remainingHits);
        } else {
            console.warn("No applyHitCallback defined");
        }
        
        // Close the dialog
        this.close();
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        console.log("Activating listeners for hit location dialog");

        this.updateDamagePreview();
        
        // Location labels for defender phase
        const locationLabels = html.find('.location-label');
        console.log(`Found ${locationLabels.length} location labels`);
        
        locationLabels.on('click', (event) => {
            event.preventDefault();
            const location = event.currentTarget.dataset.location;
            console.log(`Label clicked: ${location}`);
            
            if (this.phase === "defender") {
                // In defender phase, simply select the location
                this.selectLocation(location);
            } else {
                // In attacker phase, try to move to the location if it's available
                const adjacentLocations = this.adjacencyMap[this.selectedLocation] || [];
                if (adjacentLocations.includes(location)) {
                    if (location === this.moveHistory[this.moveHistory.length - 1]) {
                        this.moveLocation(location);
                    } else if (this.remainingHits >= this.moveCost) {
                        this.moveLocation(location);
                    }
                }
            }
        });
        
        // Body parts clickable too (both phases)
        const bodyParts = html.find('.body-part');
        bodyParts.on('click', (event) => {
            event.preventDefault();
            const location = event.currentTarget.dataset.location;
            
            if (this.phase === "defender") {
                // In defender phase, simply select the location
                this.selectLocation(location);
            } else {
                // In attacker phase, try to move to the location if it's available
                const adjacentLocations = this.adjacencyMap[this.selectedLocation] || [];
                if (adjacentLocations.includes(location)) {
                    if (location === this.moveHistory[this.moveHistory.length - 1]) {
                        this.moveLocation(location);
                    } else if (this.remainingHits >= this.moveCost) {
                        this.moveLocation(location);
                    }
                }
            }
        });
        
        // Confirm button for attacker phase
        const confirmButton = html.find('.confirm-location-btn');
        confirmButton.on('click', (event) => {
            event.preventDefault();
            if (this.selectedLocation) {
                this.applyHit(this.selectedLocation);
            }
        });

        // Random hit location button (defender phase)
        const randomButton = html.find('.random-location-btn');
        randomButton.on('click', (event) => {
            event.preventDefault();
            const locations = ['head', 'torso', 'left-arm', 'right-arm', 'left-leg', 'right-leg'];
            const randomIndex = Math.floor(Math.random() * locations.length);
            const randomLocation = locations[randomIndex];
            
            console.log(`Random location selected: ${randomLocation}`);
            this.selectLocation(randomLocation);
        });
        
        // Close buttons
        const closeButtons = html.find('.dialog-button.close');
        closeButtons.on('click', (event) => {
            event.preventDefault();
            console.log("Close button clicked");
            this.close();
        });
    }
    
    /** @override */
    close(options={}) {
        console.log("Closing hit location dialog");
        return super.close(options);
    }
}

/**
 * Create click handlers for all create-injury buttons
 */
function createInjuryButtons() {
    console.log("Setting up create injury button handlers");
    const buttons = document.querySelectorAll('.create-injury');
    console.log(`Found ${buttons.length} create injury buttons`);
    
    buttons.forEach(button => {
        // Remove any existing click handlers
        button.removeEventListener('click', createInjuryHandler);
        
        // Add click handler
        button.addEventListener('click', createInjuryHandler);
    });
}

/**
 * Handler for create injury button clicks
 * @param {Event} event The click event
 */
async function createInjuryHandler(event) {
    event.preventDefault();

    // Get the button and message element
    const button = event.currentTarget;
    const messageElement = button.closest('.message');

    if (!messageElement) {
        console.error("Could not find message element for create injury button");
        ui.notifications.error("Could not find message element. Please try again.");
        return;
    }

    // Get the message ID
    const messageId = messageElement.dataset.messageId;
    if (!messageId) {
        console.error("Could not find message ID");
        ui.notifications.error("Could not find message ID. Please try again.");
        return;
    }

    // Get the actual ChatMessage object
    const message = game.messages.get(messageId);
    if (!message) {
        console.error(`Could not find message with ID ${messageId}`);
        ui.notifications.error("Could not find message. Please try again.");
        return;
    }

    console.log("Found message for create injury button:", message);

    // Get the injury data
    const injuryData = message.getFlag("witch-iron", "injuryData");
    if (!injuryData) {
        console.error("Could not find injury data in message");
        ui.notifications.error("Could not find injury data. Please try again.");
        return;
    }

    // Get combat ID to track this workflow
    const combatId = injuryData.combatId || message.getFlag("witch-iron", "combatId");
    console.log(`Processing injury for combat ID: ${combatId}`);

    const defenderName = injuryData.defender || "Defender";
    const location = injuryData.location || "Torso";
    let baseDamage = injuryData.damage || 1; // This is the initial calculated damage before BW adjustments

    // Get specific location if available
    const specificLocation = injuryData.specificLocation || button.dataset.specificLocation || null;
    const locationRoll = injuryData.locationRoll || parseInt(button.dataset.locationRoll) || null;

    console.log(`Injury location: ${location}${specificLocation ? ` (specific: ${specificLocation}, roll: ${locationRoll})` : ''}`);

    // Ensure net hits is a positive number and represents the REMAINING hits after location adjustments
    const netHits = Math.abs(injuryData.netHits || 0);
    console.log(`Using net hits value: ${netHits} (from injury data - this should be REMAINING hits after location moves)`);

    const effect = injuryData.effect || "";

    console.log(`Injury data: baseDamage=${baseDamage}, netHits=${netHits}, location=${location}`);

    // Get the defender actor
    let defenderActor = null;

    // First try to find in tokens
    for (const token of canvas.tokens.placeables) {
        if (token.name === defenderName && token.actor) {
            defenderActor = token.actor;
            console.log(`Found defender token: ${token.name}`);
            break;
        }
    }

    // If not found in tokens, try actors directory
    if (!defenderActor) {
        defenderActor = game.actors.find(a => a.name === defenderName);
        console.log(`Found defender in actors directory: ${defenderActor?.name}`);
    }

    if (!defenderActor) {
        console.error(`Could not find defender actor: ${defenderName}`);
        ui.notifications.error(`Could not find defender "${defenderName}". Please try again.`);
        return;
    }

    try {
        // Get battle wear values *from the card UI* - these represent the wear added *in this interaction*
        const attackerWearElement = messageElement.querySelector('.attacker-wear .battle-wear-value');
        const defenderWearElement = messageElement.querySelector('.defender-wear .battle-wear-value');

        let attackerWearToAdd = 0; // Wear added via the card controls for this attack
        let defenderWearToAdd = 0; // Wear added via the card controls for this attack

        if (attackerWearElement) {
            attackerWearToAdd = parseInt(attackerWearElement.textContent) || 0;
        }

        if (defenderWearElement) {
            defenderWearToAdd = parseInt(defenderWearElement.textContent) || 0;
        }

        // Apply battle wear *addition* first (updates actor sheets and stores interaction wear in flags)
        console.log(`Passing interaction wear to applyBattleWear: Attacker +${attackerWearToAdd}, Defender +${defenderWearToAdd}`);
        const applySuccess = await applyBattleWear(message, attackerWearToAdd, defenderWearToAdd, location);
        if (!applySuccess) {
            console.error("Failed to apply battle wear, aborting injury creation.");
            // Potentially re-enable the button or show a more specific error
             button.disabled = false; // Re-enable on failure
             ui.notifications.error("Failed to update battle wear on actors.");
            return;
        }

        // DAMAGE CALCULATION based on interaction wear:
        // Start with the base damage calculated *before* any battle wear was involved
        // This base damage already includes ability, weapon bonus, net hits, and soak.
        console.log(`Base damage before interaction battle wear: ${baseDamage}`);

        // 1. Add the attacker's weapon wear *from this interaction*
        const damageWithWeaponWear = baseDamage + attackerWearToAdd;
        console.log(`Damage after interaction weapon wear (+${attackerWearToAdd}): ${damageWithWeaponWear}`);

        // 2. Only roll armor dice if there's defender wear *added in this interaction*
        let armorRollResult = 0;
        let finalDamage = damageWithWeaponWear;
        let armorRoll = null;

        if (defenderWearToAdd > 0) {
            // Create a roll for armor battle wear dice *added in this interaction*
            armorRoll = await new Roll(`${defenderWearToAdd}d6`).evaluate(); // Use modern async evaluate
            armorRollResult = armorRoll.total;

            // Subtract the armor roll from the damage (can't go below 0)
            finalDamage = Math.max(0, damageWithWeaponWear - armorRollResult);

            console.log(`Rolled ${defenderWearToAdd}d6 for interaction armor wear and got ${armorRollResult}. Final damage: ${finalDamage}`);

            // Display the armor roll using a standard dice roll chat message
            await armorRoll.toMessage({
                flavor: `${defenderName}'s Armor Battle Wear Roll (+${defenderWearToAdd}d6)`,
                speaker: ChatMessage.getSpeaker()
            });

            // Create a short follow-up injury card for the armor battle wear result
            // Pass the *original* injury data along with the final calculation results
            await createArmorBattleWearResultMessage(injuryData, finalDamage, armorRollResult, combatId, damageWithWeaponWear, attackerWearToAdd, defenderWearToAdd);

        } else {
             console.log(`No interaction armor wear added (+${defenderWearToAdd}d6), final damage remains: ${finalDamage}`);
        }

        // Use specific location in the injury name if available
        const displayLocation = specificLocation || location;

        // Generate effect based on location and *final damage*
        const fullInjuryEffect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), finalDamage);
        const injuryEffect = HitLocationSelector._trimEffectName(fullInjuryEffect);

        // Build the injury name using the first part of the effect if damage > 0
        let injuryName;
        if (finalDamage > 0) {
            let base = fullInjuryEffect.split('|')[0];
            base = base.split(',')[0];
            base = base.replace(/[*‡]/g, '').trim();
            injuryName = `${base} ${displayLocation}`;
        } else {
            injuryName = `Attack Deflected by ${displayLocation}`;
        }

        // Only create the injury item if final damage > 0
        if (finalDamage > 0) {
            // Create the injury item with specific location if available
            await HitLocationSelector._createInjuryItem(defenderActor, injuryName, displayLocation, finalDamage, injuryEffect);

            console.log(`Created injury "${injuryName}" for ${defenderName}`);
            ui.notifications.info(`Injury "${injuryName}" added to ${defenderName}.`);
        } else {
            // If damage was 0 *before* the armor roll, it's deflected by soak/low damage
            // If damage became 0 *after* the armor roll, it's deflected by armor wear
            if (defenderWearToAdd > 0) {
                 console.log(`Attack deflected by ${defenderName}'s armor roll (${armorRollResult})`);
                 ui.notifications.info(`Attack deflected by ${defenderName}'s armor.`);
            } else {
                 console.log(`Attack resulted in 0 or less damage before armor wear roll.`);
                 ui.notifications.info(`Attack failed to penetrate ${defenderName}'s defenses.`);
            }
        }

        // Disable the create injury button
        button.disabled = true;
        button.innerHTML = finalDamage > 0 ?
            `<i class="fas fa-check-circle"></i> Injury Applied` :
            `<i class="fas fa-shield-alt"></i> Attack Deflected`;
        button.style.backgroundColor = "#555";

    } catch (error) {
        console.error(`Error creating injury for ${defenderName}:`, error);
        ui.notifications.error(`Error creating injury: ${error.message}`);
        // Re-enable button on error
         button.disabled = false;
         button.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error`;
    }
}

/**
 * Creates a simple follow-up message for armor battle wear rolls
 * @param {Object} injuryData The original injury data from the main card
 * @param {number} finalDamage The final damage after armor roll
 * @param {number} armorRollResult The armor roll result
 * @param {string} combatId The combat workflow ID
 * @param {number} damageBeforeArmorRoll Damage after weapon wear but before armor roll
 * @param {number} attackerWearAdded Attacker wear added in this interaction
 * @param {number} defenderWearAdded Defender wear added (dice rolled)
 */
async function createArmorBattleWearResultMessage(injuryData, finalDamage, armorRollResult, combatId, damageBeforeArmorRoll, attackerWearAdded, defenderWearAdded) {
    // Generate severity label based on final damage
    let severityLabel = "Minor";
    if (finalDamage >= 7) {
        severityLabel = "Severe";
    } else if (finalDamage >= 4) {
        severityLabel = "Major";
    } else if (finalDamage <= 0) {
        severityLabel = "Deflected";
    }

    // Generate appropriate flavor text
    const flavor = finalDamage <= 0 ? "Attack Deflected by Armor Wear" : "Armor Wear Reduced Injury";

    // Generate effect based on location and final damage
    const location = injuryData.location;
    const specificLocation = injuryData.specificLocation || location; // Use specific if available
    const fullEffect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), finalDamage);
    const effect = HitLocationSelector._trimEffectName(fullEffect);

    // Create HTML content for the message, REMOVING the collapsible damage details section
    const content = `
    <div class="witch-iron chat-card armor-result-card injury-card ${finalDamage <= 0 ? 'deflected' : ''}">
        <div class="card-header">
            <i class="fas ${finalDamage <= 0 ? 'fa-shield-alt' : 'fa-tint'}"></i>
            <h3>${finalDamage <= 0 ? 'Attack Deflected by Armor!' : 'Final Injury Result'}</h3>
        </div>
        <div class="card-content">
            <!-- REMOVED Collapsible Damage Details Section -->
            <!--
            <div class="collapsible-section" style="display: none;"> // Hide instead of removing if preferred
                <div class="section-header combat-toggle">
                    <i class="fas fa-chevron-down"></i>
                    <h4>Calculation Details</h4>
                </div>
                <div class="section-content combat-details hidden">
                    <div class="detail-grid">
                        <div class="detail-item"><span class="label">Damage before Armor Roll:</span> <span class="value">${damageBeforeArmorRoll}</span></div>
                        <div class="detail-item"><span class="label">(Base Damage: ${injuryData.damage}, +Weapon Wear: ${attackerWearAdded})</span></div>
                        <div class="detail-item"><span class="label">Armor Roll (${defenderWearAdded}d6):</span> <span class="value">${armorRollResult}</span></div>
                        <div class="detail-item"><span class="label">Final Damage:</span> <span class="value">${finalDamage}</span></div>
                    </div>
                </div>
            </div>
            -->

            ${finalDamage <= 0 ? `
            <div class="deflected-message">
                <div class="deflected-text">Deflected!</div>
                <div class="deflected-location">Attack deflected by ${injuryData.defender}'s armor wear roll (${armorRollResult})</div>
            </div>
            ` : `
            <div class="injury-container">
                <div class="injury-header">
                    <h4>Final Injury</h4>
                </div>
                <div class="injury-row">
                    <div class="severity-col">${finalDamage}</div>
                    <div class="location-col">${specificLocation}: ${effect}</div>
                    <!-- Removed effect-col as it's combined -->
                </div>
            </div>
            `}
        </div>
    </div>
    `;

    // Create the chat message
    const message = await ChatMessage.create({
        user: game.user.id,
        content: content,
        speaker: ChatMessage.getSpeaker({alias: `${injuryData.defender}'s Armor Wear Result`}),
        flavor: flavor,
        flags: {
            "witch-iron": {
                messageType: finalDamage <= 0 ? "deflection" : "injury",
                combatId: combatId,
                isArmorResult: true, // Mark this as a result card
                // Store relevant final data for this result card
                injuryData: {
                    attacker: injuryData.attacker,
                    defender: injuryData.defender,
                    location: location, // General location
                    specificLocation: specificLocation, // Specific location
                    damage: finalDamage, // Final damage after armor roll
                    effect: effect,
                    combatId: combatId,
                    originalBaseDamage: injuryData.damage, // Store the initial base damage pre-wear
                    damageBeforeArmorRoll: damageBeforeArmorRoll,
                    armorRoll: armorRollResult,
                    attackerWearAdded: attackerWearAdded,
                    defenderWearAdded: defenderWearAdded
                }
            }
        }
    });

    console.log(`Created armor battle wear result message (${message.id}) for combat ID: ${combatId}`);
    // Ensure handlers are attached for the toggle (though toggle is removed now)
     // setTimeout(() => attachInjuryMessageHandlers(message.id), 50); // May not be needed if toggle is gone
    return message;
}

/**
 * Update the potential injury display to reflect current battle wear values
 * @param {HTMLElement} cardElement The injury card element
 */
function updatePotentialInjury(cardElement) {
    if (!cardElement) return;
    
    // Get the message ID
    const messageId = cardElement.closest('.message')?.dataset.messageId;
    if (!messageId) {
        console.error("Could not find message ID");
        return;
    }
    
    // Get the message
    const message = game.messages.get(messageId);
    if (!message) {
        console.error(`Could not find message with ID ${messageId}`);
        return;
    }
    
    // Get injury data from flags
    const injuryData = message.getFlag("witch-iron", "injuryData");
    if (!injuryData) {
        console.error("Could not find injury data in message");
        return;
    }
    
    // Get combat ID to ensure we're working with data from the same combat sequence
    const combatId = injuryData.combatId || message.getFlag("witch-iron", "combatId");
    console.log(`Updating potential injury for combat ID: ${combatId}`);
    
    // Check if this is an armor result card - if so, we don't update it
    if (message.getFlag("witch-iron", "isArmorResult")) {
        console.log("This is an armor result card - not updating potential injury");
        return;
    }
    
    // Get all the necessary values from the injury data
    const location = injuryData.location || "Torso";
    const originalDamage = injuryData.damage || 0;
    
    // Get net hits - ensure we're using the REMAINING hits after any location adjustments
    // This is stored in the injuryData.netHits field after the hit location selection is done
    const netHits = Math.abs(injuryData.netHits || 0);
    
    const weaponDmg = injuryData.weaponDmg || 0;
    const abilityDmg = injuryData.abilityDmg || 3;
    const soak = injuryData.soak || 0;
    const armorSoak = injuryData.armorSoak || 0;
    const abilitySoak = injuryData.abilitySoak || 3;
    
    // Get battle wear values from the UI
    const attackerWearElement = cardElement.querySelector('.attacker-wear .battle-wear-value');
    const defenderWearElement = cardElement.querySelector('.defender-wear .battle-wear-value');
    
    let attackerWear = attackerWearElement ? parseInt(attackerWearElement.textContent) || 0 : 0;
    let defenderWear = defenderWearElement ? parseInt(defenderWearElement.textContent) || 0 : 0;
    
    // UPDATED CALCULATION: Start with the original damage, then:
    // 1. ADD the attacker's weapon battle wear
    // 2. SUBTRACT the defender's armor battle wear roll

    // First get the base damage (from original calculation)
    // Ensure netHits is clearly included in the calculation
    const baseAttackerDamage = abilityDmg + weaponDmg + netHits;
    const baseDefenderSoak = abilitySoak + armorSoak;
    const baseDamage = Math.max(0, baseAttackerDamage - baseDefenderSoak);
    
    console.log(`Original damage calculation: (${abilityDmg} ability + ${weaponDmg} weapon + ${netHits} net hits) - (${abilitySoak} ability + ${armorSoak} armor) = ${baseDamage}`);
    
    // Now apply battle wear modifications directly:
    // 1. Add weapon battle wear (makes attack more effective)
    const damageWithWeaponWear = baseDamage + attackerWear;
    console.log(`After weapon battle wear (+${attackerWear}): ${damageWithWeaponWear}`);
    
    // 2. Subtract armor battle wear (will be rolled as dice)
    let minDamage = Math.max(0, damageWithWeaponWear - (defenderWear * 6)); // Worst case (all 6s)
    let maxDamage = damageWithWeaponWear; // Best case (no reduction if no defender dice)
    let averageDamage = Math.max(0, damageWithWeaponWear - Math.floor(defenderWear * 3.5)); // Average (3.5 per die)
    
    console.log(`Battle wear modification: +${attackerWear} weapon wear, ${defenderWear}d6 armor wear`);
    console.log(`Damage range: ${minDamage} (min) - ${averageDamage} (avg) - ${maxDamage} (max)`);
    
    // Create a new injury description based on the potential damage
    const minSeverity = getPotentialInjurySeverity(minDamage);
    const maxSeverity = getPotentialInjurySeverity(maxDamage);
    const averageSeverity = getPotentialInjurySeverity(averageDamage);
    
    // If no defender wear, the exact damage is known
    const exactDamage = defenderWear === 0 ? maxDamage : averageDamage;
    const exactSeverity = defenderWear === 0 ? maxSeverity : averageSeverity;
    
    console.log(`Final potential damage: ${exactDamage} (${exactSeverity}), range: ${minDamage}-${maxDamage}`);
    
    // Get the effect based on the expected damage
    const fullEffect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), exactDamage);
    const effect = HitLocationSelector._trimEffectName(fullEffect);
    
    // Update the injury display in the main card area
    updateInjuryDisplay(cardElement, exactDamage, location, effect, exactSeverity);
    
    // Update the button's dataset to reflect the new damage
    const injuryButton = cardElement.querySelector('.create-injury');
    if (injuryButton) {
        // Update the severity attribute to use the calculated damage
        injuryButton.dataset.severity = exactDamage.toString();
        
        // Update the description attribute using the effect's first segment
        let descBase = fullEffect.split('|')[0];
        descBase = descBase.split(',')[0];
        descBase = descBase.replace(/[*‡]/g, '').trim();
        injuryButton.dataset.description = `${descBase} ${location}`;
        
        // Update the effect attribute
        injuryButton.dataset.effect = effect;
        
        // Update the combat ID
        injuryButton.dataset.combatId = combatId;
        
        // Update button text based on armor battle wear
        if (defenderWear > 0) {
            injuryButton.innerHTML = `<i class="fas fa-dice"></i> Roll Armor Dice & Apply Injury`;
        } else {
            injuryButton.innerHTML = `<i class="fas fa-plus-circle"></i> Add Injury to ${injuryData.defender}`;
        }
    }
    
    // Update the combat details section to reflect current battle wear
    const damageText = `${abilityDmg}(${weaponDmg})`;
    const soakText = `${abilitySoak}(${armorSoak})`;
    const netDmgValue = cardElement.querySelector('.detail-item:nth-child(4) .value');
    
    if (netDmgValue) {
        netDmgValue.textContent = exactDamage;
    }
    
    // Add the calculation details to the combat details section
    const detailsSection = cardElement.querySelector('.combat-details');
    if (detailsSection) {
        // Create or get the battle wear calculation container
        let bwCalcSection = detailsSection.querySelector('.battle-wear-calculations');
        if (!bwCalcSection) {
            bwCalcSection = document.createElement('div');
            bwCalcSection.className = 'battle-wear-calculations';
            detailsSection.appendChild(bwCalcSection);
        }
        
        // Create the content based on battle wear values - updated to show that weapon wear adds to damage
        // and armor wear is rolled as dice to reduce damage
        // IMPORTANT: Make sure we're showing the remaining net hits after location movement
        let calcContent = `
            <div class="calculation-header">
                <h5>Damage Calculation</h5>
            </div>
            <div class="calculation-formula">
                <div class="base-damage">Base: (${abilityDmg} ability + ${weaponDmg} weapon + <strong>${netHits} remaining net hits</strong>) - (${abilitySoak} ability + ${armorSoak} armor) = ${baseDamage}</div>
                <div class="battle-wear-effect">Battle Wear: ${baseDamage} base damage + ${attackerWear} weapon wear`;
        
        if (defenderWear > 0) {
            calcContent += ` - ${defenderWear}d6 armor wear (avg: ${Math.floor(defenderWear * 3.5)})`;
        }
        
        calcContent += ` = ${exactDamage}</div>`;
        
        if (defenderWear > 0) {
            calcContent += `<div class="damage-range">Possible range: ${minDamage} to ${maxDamage} depending on armor dice</div>`;
        }
        
        calcContent += `</div>`;
        
        bwCalcSection.innerHTML = calcContent;
    }
}

/**
 * Update the main injury display in the card
 * @param {HTMLElement} cardElement The injury card element
 * @param {number} damage The calculated damage
 * @param {string} location The hit location
 * @param {string} effect The injury effect
 * @param {string} severity The injury severity label
 */
function updateInjuryDisplay(cardElement, damage, location, effect, severityLabel) {
    // Find the injury container or create it if not found
    let injuryContainer = cardElement.querySelector('.injury-container');
    
    // Create or show injury container
    if (!injuryContainer) {
        injuryContainer = document.createElement('div');
        injuryContainer.className = 'injury-container';
        
        // Find where to insert it
        const injuryButton = cardElement.querySelector('.create-injury');
        if (injuryButton) {
            injuryButton.parentNode.insertBefore(injuryContainer, injuryButton);
        } else {
            const cardContent = cardElement.querySelector('.card-content');
            if (cardContent) {
                cardContent.appendChild(injuryContainer);
            }
        }
    }
    
    // Show injury container
    injuryContainer.style.display = '';
    
    // Update injury content
    injuryContainer.innerHTML = `
        <div class="injury-header">
            <h4>Injury</h4>
        </div>
        <div class="injury-row">
            <div class="severity-col">${damage}</div>
            <div class="location-col">${location}</div>
            <div class="effect-col">${effect}</div>
        </div>
    `;
}

/**
 * Get the severity label based on damage value
 * @param {number} damage The damage value
 * @returns {string} The severity label
 */
function getPotentialInjurySeverity(damage) {
    if (damage <= 0) return "Deflected";
    if (damage < 4) return "Minor";
    if (damage < 7) return "Major";
    return "Severe";
}

/**
 * Attach event handlers to an injury message
 * @param {string} messageId ID of the chat message
 */
function attachInjuryMessageHandlers(messageId) {
    console.log(`Attaching injury message handlers to message ${messageId}`);
    
    // Find the message in the DOM
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) {
        console.warn(`Could not find message element for ID ${messageId}`);
        return;
    }
    
    // Find and fix the combat toggle button
    const combatToggle = messageElement.querySelector('.combat-toggle');
    if (combatToggle) {
        console.log("Found combat toggle button, attaching handler");
        // Remove any existing handlers
        const newToggle = combatToggle.cloneNode(true);
        combatToggle.parentNode.replaceChild(newToggle, combatToggle);
        
        // Attach new click handler
        newToggle.addEventListener('click', (event) => {
            event.preventDefault();
            const detailsContent = messageElement.querySelector('.combat-details');
            const icon = newToggle.querySelector('i.fas');
            
            if (detailsContent) {
                const isHidden = detailsContent.classList.contains('hidden');
                
                // Toggle visibility
                if (isHidden) {
                    detailsContent.classList.remove('hidden');
                    if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                } else {
                    detailsContent.classList.add('hidden');
                    if (icon) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                }
                
                console.log(`Combat details ${isHidden ? 'shown' : 'hidden'}`);
            }
        });
    }
    
    // Attach handlers to damage calculation tabs
    const damageTabs = messageElement.querySelectorAll('.damage-tab');
    if (damageTabs.length > 0) {
        console.log("Found damage calculation tabs, attaching handlers");
        damageTabs.forEach(tab => {
            // Clone to remove any existing handlers
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // Attach new handler
            newTab.addEventListener('click', (event) => {
                event.preventDefault();
                
                // Remove active class from all tabs
                const allTabs = messageElement.querySelectorAll('.damage-tab');
                allTabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to the clicked tab
                newTab.classList.add('active');
                
                // Update the injury display based on the selected tab
                const tabType = newTab.dataset.tab;
                updateInjuryDisplayForTab(messageElement, tabType);
            });
        });
    }
    
    // Attach handlers to injury button
    const createInjuryBtn = messageElement.querySelector('.create-injury');
    if (createInjuryBtn) {
        console.log("Found create injury button, attaching handler");
        // Remove any existing handlers by cloning
        const newBtn = createInjuryBtn.cloneNode(true);
        createInjuryBtn.parentNode.replaceChild(newBtn, createInjuryBtn);
        
        // Attach new handler
        newBtn.addEventListener('click', createInjuryHandler);
    }
    
    // Attach handlers to battle wear buttons
    const battleWearBtns = messageElement.querySelectorAll('.battle-wear-plus, .battle-wear-minus');
    battleWearBtns.forEach(button => {
        console.log("Found battle wear button, attaching handler");
        // Clone to remove existing handlers
        const newBtn = button.cloneNode(true);
        button.parentNode.replaceChild(newBtn, button);
        
        // Attach new handler
        newBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log("Battle wear button clicked");
            
            // Get the attacker and defender wear values
            const attackerWearEl = messageElement.querySelector('.attacker-wear .battle-wear-value');
            const defenderWearEl = messageElement.querySelector('.defender-wear .battle-wear-value');
            
            let attackerWear = parseInt(attackerWearEl?.textContent) || 0;
            let defenderWear = parseInt(defenderWearEl?.textContent) || 0;
            
            // Determine which button was clicked
            const isPlus = newBtn.classList.contains('battle-wear-plus');
            const isAttacker = newBtn.closest('.attacker-wear');
            
            // Update the appropriate wear value
            if (isAttacker) {
                attackerWear = isPlus ? attackerWear + 1 : Math.max(0, attackerWear - 1);
                if (attackerWearEl) attackerWearEl.textContent = attackerWear;
                const attackerBonusEl = messageElement.querySelector('.attacker-wear .battle-wear-bonus');
                if (attackerBonusEl) attackerBonusEl.textContent = attackerWear;
            } else {
                defenderWear = isPlus ? defenderWear + 1 : Math.max(0, defenderWear - 1);
                if (defenderWearEl) defenderWearEl.textContent = defenderWear;
                const defenderBonusEl = messageElement.querySelector('.defender-wear .battle-wear-bonus');
                if (defenderBonusEl) defenderBonusEl.textContent = defenderWear;
                
                // Show/hide tabs based on defender wear
                const injuryHeader = messageElement.querySelector('.injury-header');
                const damageTabs = messageElement.querySelector('.damage-calc-tabs');
                
                if (injuryHeader) {
                    // If tabs don't exist and defender wear > 0, create them
                    if (!damageTabs && defenderWear > 0) {
                        const tabsDiv = document.createElement('div');
                        tabsDiv.className = 'damage-calc-tabs';
                        tabsDiv.innerHTML = `
                            <button class="damage-tab" data-tab="min">Min</button>
                            <button class="damage-tab active" data-tab="avg">Avg</button>
                            <button class="damage-tab" data-tab="max">Max</button>
                        `;
                        injuryHeader.appendChild(tabsDiv);
                        
                        // Attach handlers to the new tabs
                        const newTabs = tabsDiv.querySelectorAll('.damage-tab');
                        newTabs.forEach(tab => {
                            tab.addEventListener('click', (e) => {
                                e.preventDefault();
                                const allTabs = messageElement.querySelectorAll('.damage-tab');
                                allTabs.forEach(t => t.classList.remove('active'));
                                tab.classList.add('active');
                                updateInjuryDisplayForTab(messageElement, tab.dataset.tab);
                            });
                        });
                    } 
                    // If tabs exist and defender wear is 0, remove them
                    else if (damageTabs && defenderWear === 0) {
                        injuryHeader.removeChild(damageTabs);
                    }
                }
            }
            
            // Update injury display based on new wear values and active tab
            const activeTab = messageElement.querySelector('.damage-tab.active');
            const tabType = activeTab ? activeTab.dataset.tab : 'avg';
            
            updateInjuryDisplayForTab(messageElement, tabType);
            
            // Enable/disable buttons based on current values
            updateBattleWearButtons(messageElement);
            
            // Get the message ID to update the server-side data
            const messageId = messageElement.closest('.message')?.dataset.messageId;
            if (messageId) {
                const message = game.messages.get(messageId);
                if (message) {
                    // Get the current attacker and defender wear values from the UI
                    const currentAttackerWear = parseInt(messageElement.querySelector('.attacker-wear .battle-wear-value').textContent) || 0;
                    const currentDefenderWear = parseInt(messageElement.querySelector('.defender-wear .battle-wear-value').textContent) || 0;
                    
                    console.log(`Preparing battle wear update: Attacker: ${currentAttackerWear}, Defender: ${currentDefenderWear}`);
                    
                    // Add a processing indicator
                    const battleWearContainer = messageElement.querySelector('.battle-wear-container');
                    let processingIndicator = messageElement.querySelector('.battle-wear-processing');
                    
                    if (!processingIndicator && battleWearContainer) {
                        processingIndicator = document.createElement('div');
                        processingIndicator.className = 'battle-wear-processing';
                        processingIndicator.innerHTML = `
                            <i class="fas fa-sync fa-spin"></i>
                            <span>Updating battle wear...</span>
                        `;
                        battleWearContainer.appendChild(processingIndicator);
                    }
                    
                    // Temporarily disable all battle wear buttons
                    const allButtons = messageElement.querySelectorAll('.battle-wear-plus, .battle-wear-minus');
                    allButtons.forEach(btn => btn.disabled = true);
                    
                    try {
                        if (game.user.isGM) {
                            // GM users can update message flags directly
                            console.log("User is GM - recording battle wear selection");

                            // Update message flags with the selected values
                            const locEl = messageElement.querySelector('.injury-row');
                            const loc = locEl?.dataset.location?.toLowerCase() || 'torso';
                            await message.update({
                                "flags.witch-iron.battleWear": {
                                    attacker: currentAttackerWear,
                                    defender: currentDefenderWear,
                                    location: loc
                                }
                            });

                            // Broadcast to all clients that the update is complete
                            game.socket.emit("system.witch-iron.battleWearUpdate", {
                                messageId: message.id,
                                attackerWear: currentAttackerWear,
                                defenderWear: currentDefenderWear,
                                location: loc,
                                userId: game.user.id,
                                completed: true
                            });
                        } else {
                            // Regular users send a request to the GM via invisible chat message
                            console.log("User is not GM - sending battle wear update request via chat message");
                            
                            // Create a data object with all necessary info
                            const updateData = {
                                messageId: messageId,
                                attackerWear: currentAttackerWear,
                                defenderWear: currentDefenderWear,
                                location: loc,
                                requesterId: game.user.id,
                                timestamp: Date.now()
                            };
                            
                            // Send the request to the GM
                            await sendBattleWearUpdateRequest(updateData);
                            
                            
                            // Set a timeout to restore buttons if no response received
                            setTimeout(() => {
                                if (messageElement.querySelector('.battle-wear-processing')) {
                                    // Remove processing indicator
                                    messageElement.querySelector('.battle-wear-processing').remove();
                                    
                                    // Re-enable buttons
                                    updateBattleWearButtons(messageElement);
                                    
                                }
                            }, 10000); // 10 second timeout
                        }
                    } catch (error) {
                        console.error("Error updating battle wear:", error);
                        ui.notifications.error("Failed to update battle wear");
                        
                        // Remove processing indicator
                        if (processingIndicator) {
                            processingIndicator.remove();
                        }
                        
                        // Re-enable buttons
                        updateBattleWearButtons(messageElement);
                    }
                }
            }
        });
    });
}

/**
 * Update battle wear buttons enabled/disabled state
 * @param {HTMLElement} messageElement The message element
 */
function updateBattleWearButtons(messageElement) {
    // Attacker buttons
    const attackerWearEl = messageElement.querySelector('.attacker-wear .battle-wear-value');
    const attackerMaxEl = messageElement.querySelector('.attacker-wear .battle-wear-max');
    if (attackerWearEl && attackerMaxEl) {
        const attackerWear = parseInt(attackerWearEl.textContent) || 0;
        const attackerMax = parseInt(attackerMaxEl.textContent) || 0;
        
        const attackerPlusBtn = messageElement.querySelector('.attacker-wear .battle-wear-plus');
        const attackerMinusBtn = messageElement.querySelector('.attacker-wear .battle-wear-minus');
        
        if (attackerPlusBtn) attackerPlusBtn.disabled = attackerWear >= attackerMax;
        if (attackerMinusBtn) attackerMinusBtn.disabled = attackerWear <= 0;
    }
    
    // Defender buttons
    const defenderWearEl = messageElement.querySelector('.defender-wear .battle-wear-value');
    const defenderMaxEl = messageElement.querySelector('.defender-wear .battle-wear-max');
    if (defenderWearEl && defenderMaxEl) {
        const defenderWear = parseInt(defenderWearEl.textContent) || 0;
        const defenderMax = parseInt(defenderMaxEl.textContent) || 0;
        
        const defenderPlusBtn = messageElement.querySelector('.defender-wear .battle-wear-plus');
        const defenderMinusBtn = messageElement.querySelector('.defender-wear .battle-wear-minus');
        
        if (defenderPlusBtn) defenderPlusBtn.disabled = defenderWear >= defenderMax;
        if (defenderMinusBtn) defenderMinusBtn.disabled = defenderWear <= 0;
    }
}

/**
 * Updates the injury display based on the selected damage calculation tab
 * @param {HTMLElement} messageElement The message element
 * @param {string} tabType The type of tab ('min', 'avg', 'max')
 */
function updateInjuryDisplayForTab(messageElement, tabType = 'avg') {
    if (!messageElement) return;
    
    const messageId = messageElement.closest('.message')?.dataset.messageId;
    if (!messageId) {
        console.error("Could not find message ID");
        return;
    }
    
    const message = game.messages.get(messageId);
    if (!message) {
        console.error(`Could not find message with ID ${messageId}`);
        return;
    }
    
    const injuryData = message.getFlag("witch-iron", "injuryData");
    if (!injuryData) {
        console.error("Could not find injury data in message");
        return;
    }

    console.log("[DEBUG updateInjuryDisplayForTab] Raw injuryData:", injuryData); // Log raw data

    const combatId = injuryData.combatId || message.getFlag("witch-iron", "combatId");
    console.log(`Updating potential injury for combat ID: ${combatId} with tab: ${tabType}`);
    
    const location = injuryData.location || "Torso";
    const specificLocation = injuryData.specificLocation || null;
    const locationRoll = injuryData.locationRoll || null;
    
    // --- Get Base Ability Bonuses (should be reliable) ---
    const abilityDmg = injuryData.abilityDmg ?? 3; // Use nullish coalescing for default
    const abilitySoak = injuryData.abilitySoak ?? 3; // Use nullish coalescing for default

    // --- Get EFFECTIVE Bonuses (Add checks and defaults) ---
    const effectiveWeaponBonus = injuryData.weaponDmg ?? 0; // Default to 0 if null/undefined
    const effectiveArmorBonus = injuryData.armorSoak ?? 0; // Default to 0 if null/undefined

    console.log(`[DEBUG updateInjuryDisplayForTab] Effective Bonuses - Weapon: ${effectiveWeaponBonus}, Armor: ${effectiveArmorBonus}`);

    // --- Get Remaining Net Hits ---
    const netHits = Math.abs(injuryData.netHits || 0); // Use remaining net hits

    // --- Get Interaction Wear from UI ---
    const attackerWearElement = messageElement.querySelector('.attacker-wear .battle-wear-value');
    const defenderWearElement = messageElement.querySelector('.defender-wear .battle-wear-value');
    
    let attackerInteractionWear = attackerWearElement ? parseInt(attackerWearElement.textContent) || 0 : 0;
    let defenderInteractionWear = defenderWearElement ? parseInt(defenderWearElement.textContent) || 0 : 0;

    console.log(`[DEBUG] Interaction wear values from card - Attacker: ${attackerInteractionWear}, Defender: ${defenderInteractionWear}`);

    // --- REVISED DAMAGE CALCULATION ---
    // 1. Calculate base damage using EFFECTIVE bonuses and NET HITS
    const baseAttackerDamage = abilityDmg + effectiveWeaponBonus + netHits;
    const baseDefenderSoak = abilitySoak + effectiveArmorBonus;
    const baseDamageWithEffectiveBonuses = Math.max(0, baseAttackerDamage - baseDefenderSoak);
    console.log(`Base damage calc (using effective bonuses): (${abilityDmg} + ${effectiveWeaponBonus} eff Wpn + ${netHits} net hits) - (${abilitySoak} + ${effectiveArmorBonus} eff Arm) = ${baseDamageWithEffectiveBonuses}`);

    // 2. Add the INTERACTION attacker wear from the card controls
    const damageWithInteractionWeaponWear = baseDamageWithEffectiveBonuses + attackerInteractionWear;
    console.log(`Damage after INTERACTION weapon wear (+${attackerInteractionWear}): ${damageWithInteractionWeaponWear}`);

    // 3. Calculate final damage based on the selected tab and INTERACTION defender wear (dice)
    let finalDamage;
    let armorDiceValue;
    
    if (defenderInteractionWear > 0) {
        switch (tabType) {
            case 'min': // Min damage means MAX reduction
                armorDiceValue = defenderInteractionWear * 6;
                finalDamage = Math.max(0, damageWithInteractionWeaponWear - armorDiceValue);
                break;
            case 'max': // Max damage means MIN reduction
                armorDiceValue = defenderInteractionWear * 1;
                finalDamage = Math.max(0, damageWithInteractionWeaponWear - armorDiceValue);
                break;
            case 'avg':
            default:
                armorDiceValue = Math.floor(defenderInteractionWear * 3.5);
                finalDamage = Math.max(0, damageWithInteractionWeaponWear - armorDiceValue);
                break;
        }
        console.log(`${tabType.toUpperCase()} armor calc: ${defenderInteractionWear}d6 ≈ ${armorDiceValue} reduction`);
    } else {
        armorDiceValue = 0;
        finalDamage = damageWithInteractionWeaponWear;
        console.log(`[DEBUG] No interaction armor wear - final damage set to ${finalDamage}`);
    }
    
    console.log(`Final potential damage (${tabType.toUpperCase()}): ${finalDamage}`);

    // --- Determine Effect and Location Display ---
    let effect = "Pain 1";
    let displayLocation = location; 
    // ... (effect calculation logic remains the same) ...
     if (specificLocation && locationRoll !== null) {
        // We have a stored specific location and roll, use them!
        displayLocation = specificLocation; // Use the stored specific name
        
        // Get the base location key (head, torso, etc.)
        let baseLocationKey = null;
        const normalizedLocation = location.toLowerCase().replace(/\s+/g, '');
        if (normalizedLocation.includes('head')) baseLocationKey = 'head';
        else if (normalizedLocation.includes('torso')) baseLocationKey = 'torso';
        else if (normalizedLocation.includes('arm')) baseLocationKey = 'arm';
        else if (normalizedLocation.includes('leg')) baseLocationKey = 'leg';

        if (baseLocationKey) {
            // Get the injury details from the table using the STORED roll
            const injury = rollOnInjuryTable(baseLocationKey, locationRoll);
            if (injury) {
                effect = getInjuryEffect(injury, finalDamage); // Calculate effect based on final damage
            } else {
                console.warn(`Could not find injury in table '${baseLocationKey}' for roll ${locationRoll}`);
            }
        } else {
            console.warn(`Could not determine base location key for: ${location}`);
        }
    } else {
        // Fallback: If no specific location stored, use the generic effect generation
        console.warn("Missing specific location or roll in flags, falling back to generic effect generation");
        effect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), finalDamage);
    }

    const trimmedEffect = HitLocationSelector._trimEffectName(effect);

    const severityLabel = getPotentialInjurySeverity(finalDamage);

    // --- Update UI Displays ---
    // Update the main injury row (Severity, Location: Effect)
    const injuryRow = messageElement.querySelector('.injury-row');
    if (injuryRow) {
        const severityCol = injuryRow.querySelector('.severity-col');
        const locationCol = injuryRow.querySelector('.location-col'); // Combined location/effect column
        
        if (severityCol) severityCol.textContent = finalDamage;
        
        if (locationCol) {
            if (finalDamage <= 0) {
                 locationCol.innerHTML = `<span class="deflected">Deflected!</span>`;
            } else {
                 locationCol.textContent = `${displayLocation}: ${trimmedEffect}`; // Combine location and effect
            }
        }
         console.log(`[DEBUG Update Effect] Final Damage: ${finalDamage}, Specific Loc: ${displayLocation}, Calculated Effect: ${trimmedEffect}`);
    } else {
        console.warn(`[DEBUG] Could not find injury row in message ${messageId}`);
    }

    // Update the create injury button data attributes (optional but good practice)
    const injuryButton = messageElement.querySelector('.create-injury');
     if (injuryButton && injuryData.defender) {
         // Update the severity attribute to use the calculated damage
         injuryButton.dataset.severity = finalDamage.toString();
         if (finalDamage > 0) {
             let descBase = effect.split('|')[0];
             descBase = descBase.split(',')[0];
             descBase = descBase.replace(/[*‡]/g, '').trim();
             injuryButton.dataset.description = `${descBase} ${displayLocation}`;
         } else {
             injuryButton.dataset.description = "Deflected";
         }
         injuryButton.dataset.effect = trimmedEffect;
         injuryButton.dataset.combatId = combatId;

         // Update button text based on interaction armor wear
         if (defenderInteractionWear > 0) {
             injuryButton.innerHTML = `<i class="fas fa-dice"></i> Roll Armor Dice & Apply Injury`;
         } else {
             injuryButton.innerHTML = `<i class="fas fa-plus-circle"></i> Add Injury to ${injuryData.defender}`;
         }
         // Re-enable button if damage is possible (it might have been disabled if previous calculation was 0)
         injuryButton.disabled = false;
     }

    // --- Pass verified data to details display function ---
    updateDamageCalculationDetails(messageElement, {
        abilityDmg,
        effectiveWeaponBonus: effectiveWeaponBonus, // Pass verified effective bonus
        netHits,
        abilitySoak,
        effectiveArmorBonus: effectiveArmorBonus, // Pass verified effective bonus
        baseDamageWithEffectiveBonuses,
        attackerInteractionWear,
        defenderInteractionWear,
        armorDiceValue,
        finalDamage,
        tabType
    });
}

/**
 * Updates the damage calculation details in the combat details section
 * (Now modified to *not* display the section)
 */
function updateDamageCalculationDetails(messageElement, calcData) {
    // Find the section - if it exists, ensure it's hidden or remove it.
    const detailsSection = messageElement.querySelector('.combat-details');
    if (!detailsSection) return; // If the main details section isn't there, do nothing.

    const bwCalcSection = detailsSection.querySelector('.battle-wear-calculations');
    if (bwCalcSection) {
        // Option 1: Remove the section entirely
        // bwCalcSection.remove();

        // Option 2: Hide the section (might be safer if other logic depends on it)
        bwCalcSection.style.display = 'none';
        console.log("Hiding damage calculation details section.");
    }

    // Also hide the toggle button for this section if it exists within the main combat details header
    const combatToggle = messageElement.querySelector('.combat-toggle');
    const headerTextElement = combatToggle?.querySelector('h4');
    // Check if the header text is 'Calculation Details' to be specific
    if (combatToggle && headerTextElement && headerTextElement.textContent.trim() === 'Calculation Details') {
        combatToggle.style.display = 'none';
         console.log("Hiding damage calculation toggle button.");
         // Ensure the parent section (.collapsible-section) is also hidden
         const collapsibleSection = combatToggle.closest('.collapsible-section');
         if (collapsibleSection) {
             collapsibleSection.style.display = 'none';
         }
    }


    // --- Original code is now commented out or removed ---
    /*
    // Create or get the battle wear calculation container
    let bwCalcSection = detailsSection.querySelector('.battle-wear-calculations');
    if (!bwCalcSection) {
        // Don't create it if it doesn't exist
        // bwCalcSection = document.createElement('div');
        // bwCalcSection.className = 'battle-wear-calculations';
        // const detailGrid = detailsSection.querySelector('.detail-grid');
        // if (detailGrid) {
        //      detailGrid.insertAdjacentElement('afterend', bwCalcSection);
        // } else {
        //      detailsSection.appendChild(bwCalcSection); // Fallback
        // }
        return; // If section doesn't exist, do nothing further
    }

    // Clear existing content instead of adding new content
    bwCalcSection.innerHTML = '';
    bwCalcSection.style.display = 'none'; // Ensure it's hidden

    console.log("Damage calculation details section hidden.");
    */
}

/**
 * Updates the battle wear values for actors
 * @param {ChatMessage} message The chat message with attacker/defender info
 * @param {number} attackerWear Amount of battle wear for attacker's weapon
 * @param {number} defenderWear Amount of battle wear for defender's armor
 * @returns {Promise} Promise that resolves when updates are complete
 */
async function updateActorBattleWear(message, attackerWear, defenderWear, location="torso") {
    // Get attacker and defender names from the message
    let attackerName = "Attacker";
    let defenderName = "Defender";
    
    // Try to get names from message flags first (most reliable)
    const messageData = message?.getFlag?.("witch-iron", "injuryData");
    if (messageData) {
        if (messageData.attacker) attackerName = messageData.attacker;
        if (messageData.defender) defenderName = messageData.defender;
        console.log(`Found names in message flags - Attacker: "${attackerName}", Defender: "${defenderName}"`);
    } else {
        // Try to extract names from HTML content
        const messageElement = document.querySelector(`.message[data-message-id="${message.id}"]`);
        if (messageElement) {
            const attackerEl = messageElement.querySelector('.combatant.attacker .token-name');
            const defenderEl = messageElement.querySelector('.combatant.defender .token-name');
            
            if (attackerEl && defenderEl) {
                attackerName = attackerEl.textContent.trim();
                defenderName = defenderEl.textContent.trim();
                console.log(`Found names in message element - Attacker: "${attackerName}", Defender: "${defenderName}"`);
            }
        }
    }
    
    console.log(`Updating battle wear for - Attacker: "${attackerName}", Defender: "${defenderName}"`);
    
    // Find the attacker and defender actors
    let attackerActor = null;
    let defenderActor = null;
    
    // Function to find an actor by name
    const findActor = (name) => {
        // First check tokens
        let actor = null;
        for (const token of canvas.tokens.placeables) {
            if (token.name === name && token.actor) {
                actor = token.actor;
                console.log(`Found actor in tokens: ${token.name}`);
                break;
            }
        }
        
        // If not found in tokens, check actors directory
        if (!actor) {
            actor = game.actors.find(a => a.name === name);
            if (actor) {
                console.log(`Found actor in directory: ${actor.name}`);
            }
        }
        
        return actor;
    };
    
    // Find the actors
    attackerActor = findActor(attackerName);
    defenderActor = findActor(defenderName);
    
    const updatePromises = [];
    
    // Update attacker
    if (attackerActor) {
        console.log(`Updating ${attackerName}'s weapon battle wear to ${attackerWear}`);

        if (!attackerActor.system.battleWear) {
            updatePromises.push(
                attackerActor.update({
                    "system.battleWear": {
                        weapon: { value: 0, max: 4 },
                        armor: { head:{value:0}, torso:{value:0}, leftArm:{value:0}, rightArm:{value:0}, leftLeg:{value:0}, rightLeg:{value:0} }
                    }
                })
            );
        }

        updatePromises.push(attackerActor.update({ "system.battleWear.weapon.value": attackerWear }));

        const weaponItem = attackerActor.items.find(i => i.type === 'weapon' && i.system.equipped);
        if (weaponItem) {
            updatePromises.push(weaponItem.update({ "system.wear.value": attackerWear }));
        }
    } else {
        console.warn(`Could not find attacker actor: ${attackerName}`);
    }
    
    // Update defender
    if (defenderActor) {
        const locMap = { head:'head', torso:'torso', 'left-arm':'leftArm', 'right-arm':'rightArm', 'left-leg':'leftLeg', 'right-leg':'rightLeg' };
        const normalizedLocation = String(location).toLowerCase().replace(/\s+/g, '-');
        const locKey = locMap[normalizedLocation] || normalizedLocation;
        console.log(`Updating ${defenderName}'s armor battle wear to ${defenderWear} at ${locKey}`);
        
        // Ensure the system is initialized
        if (!defenderActor.system.battleWear) {
            updatePromises.push(
                defenderActor.update({
                    "system.battleWear": {
                        weapon: { value: 0, max: 4 },
                        armor: { head:{value:0}, torso:{value:0}, leftArm:{value:0}, rightArm:{value:0}, leftLeg:{value:0}, rightLeg:{value:0} }
                    }
                })
            );
        }
        
        const updateObj = {};
        updateObj[`system.battleWear.armor.${locKey}.value`] = defenderWear;
        updatePromises.push(defenderActor.update(updateObj));

        const armorItem = defenderActor.items.find(i => i.type === 'armor' && i.system.equipped && i.system.locations?.[locKey]);
        if (armorItem) {
            const prot = Number(armorItem.system.protection?.value || 0);
            const wearVal = Math.min(defenderWear, prot);
            const upd = {}; upd[`system.wear.${locKey}.value`] = wearVal;
            let name = armorItem.name;
            const destroyed = Object.entries(armorItem.system.locations || {}).every(([l,en]) => {
                if (!en) return true;
                const w = l===locKey ? wearVal : Number(armorItem.system.wear?.[l]?.value || 0);
                return w >= prot;
            });
            if (destroyed && !name.startsWith('(Destroyed) ')) name = `(Destroyed) ${name}`;
            if (!destroyed && name.startsWith('(Destroyed) ')) name = name.replace(/^\(Destroyed\)\s*/, '');
            upd.name = name;
            updatePromises.push(armorItem.update(upd));
        }

        if (defenderActor.sheet && typeof defenderActor.sheet._syncActorWearFromItems === 'function') {
            defenderActor.sheet._syncActorWearFromItems();
            if (defenderActor.sheet._updateArmorTotals)
                await defenderActor.sheet._updateArmorTotals();
        }
    } else {
        console.warn(`Could not find defender actor: ${defenderName}`);
    }
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Return success
    return true;
}

/**
 * Create a rout result chat card
 * @param {string} mobName - Name of the mob
 * @param {boolean} success - Whether the rout check succeeded
 */
async function createRoutResultCard(mobName, success) {
    const content = await renderTemplate(
        "systems/witch-iron/templates/chat/rout-result.hbs",
        { mob: mobName, success }
    );
    await ChatMessage.create({
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
        flavor: "Rout Result",
        flags: { "witch-iron": { messageType: "rout-result" } }
    });
}

// Register a specific hook for injury message rendering
Hooks.on("renderChatMessage", (message, html, data) => {
    // Check if this is an injury message
    const messageType = message.getFlag("witch-iron", "messageType");
    if (messageType === "injury" || messageType === "deflection") {
        console.log(`Detected injury message being rendered: ${message.id}`);
        
        // Short delay to ensure DOM is fully rendered
        setTimeout(() => {
            // Get the message element
            const messageElement = html[0].closest('.message');
            if (messageElement) {
                // Check if we have stored battle wear values in the message flags
                const storedBattleWear = message.getFlag("witch-iron", "battleWear");
                
                // Initialize UI with stored values if present (first render)
                if (storedBattleWear && !messageElement.classList.contains('bw-initialized')) {
                    console.log("Found stored battle wear values, initializing UI:", storedBattleWear);
                    
                    const attackerWearEl = messageElement.querySelector('.attacker-wear .battle-wear-value');
                    const defenderWearEl = messageElement.querySelector('.defender-wear .battle-wear-value');
                    
                    if (attackerWearEl && typeof storedBattleWear.attacker === 'number') {
                        attackerWearEl.textContent = storedBattleWear.attacker;
                        const attackerBonusEl = messageElement.querySelector('.attacker-wear .battle-wear-bonus');
                        if (attackerBonusEl) attackerBonusEl.textContent = storedBattleWear.attacker;
                    }
                    
                    if (defenderWearEl && typeof storedBattleWear.defender === 'number') {
                        defenderWearEl.textContent = storedBattleWear.defender;
                        const defenderBonusEl = messageElement.querySelector('.defender-wear .battle-wear-bonus');
                        if (defenderBonusEl) defenderBonusEl.textContent = storedBattleWear.defender;
                    }
                    
                    // Show/hide damage calculation tabs based on defender wear
                    const injuryHeader = messageElement.querySelector('.injury-header');
                    const damageTabs = messageElement.querySelector('.damage-calc-tabs');
                    
                    if (injuryHeader) {
                        if (storedBattleWear.defender > 0 && !damageTabs) {
                            const tabsDiv = document.createElement('div');
                            tabsDiv.className = 'damage-calc-tabs';
                            tabsDiv.innerHTML = `
                                <button class="damage-tab" data-tab="min">Min</button>
                                <button class="damage-tab active" data-tab="avg">Avg</button>
                                <button class="damage-tab" data-tab="max">Max</button>
                            `;
                            injuryHeader.appendChild(tabsDiv);
                        } else if (storedBattleWear.defender === 0 && damageTabs) {
                            injuryHeader.removeChild(damageTabs);
                        }
                    }
                    
                    // Update button states based on initialized values
                    updateBattleWearButtons(messageElement);
                    
                    // Update the display based on the initialized values and default tab
                    // We call this ONCE on initial render with flags to set the correct baseline effect
                    updateInjuryDisplayForTab(messageElement, 
                        (messageElement.querySelector('.damage-tab.active')?.dataset?.tab || 'avg'));

                    // Mark as initialized to prevent re-running this block on subsequent renders
                    messageElement.classList.add('bw-initialized'); 
                }

                // Always attach event handlers to ensure they work after re-renders
                attachInjuryMessageHandlers(message.id);
                
            }
        }, 50);
    }
});

// When the game is ready, set up our message listeners
Hooks.once("ready", () => {
    // Listen for system messages that are meant only for GMs
    Hooks.on("createChatMessage", (message) => {
        // Only GMs should process these requests
        if (!game.user.isGM) return;
        
        // Check if this is a battle wear update request
        const messageType = message.getFlag("witch-iron", "messageType");
        if (messageType === "battle-wear-update-request") {
            console.log("GM received battle wear update request via chat message");
            
            // Extract the data from the message
            const data = message.getFlag("witch-iron", "data");
            if (!data) {
                console.error("Missing data in battle wear update request");
                return;
            }
            
            // Process the battle wear update
            processBattleWearUpdateRequest(data)
                .then(() => {
                    console.log("Battle wear update request processed successfully");
                    // Delete the request message to keep chat clean
                    message.delete();
                })
                .catch(error => {
                    console.error("Error processing battle wear update:", error);
                    // Delete the request message even if there was an error
                    message.delete();
                });
        }
    });
});

/**
 * Sends a battle wear update request to the GM via an invisible chat message
 * @param {Object} data - The data to send to the GM
 * @returns {Promise<ChatMessage>} - The created message
 */
async function sendBattleWearUpdateRequest(data) {
    console.log("Sending battle wear update request to GM:", data);
    
    // Create the message data - only visible to GM
    const messageData = {
        content: `<div class="witch-iron-system-message">System: Battle Wear Update Request</div>`,
        whisper: ChatMessage.getWhisperRecipients("GM"),
        speaker: ChatMessage.getSpeaker({ alias: "System" }),
        flags: {
            "witch-iron": {
                messageType: "battle-wear-update-request",
                data: data
            }
        }
    };
    
    // Create the message
    try {
        return await ChatMessage.create(messageData);
    } catch (error) {
        console.error("Error sending battle wear update request:", error);
        ui.notifications.error("Failed to send battle wear update request");
        return null;
    }
}

/**
 * Process a battle wear update request (GM only)
 * @param {Object} data - The battle wear update data
 * @returns {Promise} - Resolves when the update is complete
 */
async function processBattleWearUpdateRequest(data) {
    console.log("Processing battle wear update request:", data);
    
    // Get the message that needs updating
    const message = game.messages.get(data.messageId);
    if (!message) {
        console.error(`Message ${data.messageId} not found`);
        return;
    }
    
    // Extra debug for weapon-only updates
    if (data.attackerWear > 0 && data.defenderWear === 0) {
        console.log(`[DEBUG GM] Processing weapon-only battle wear update for message ${data.messageId}`);
        
        // Get existing flags for comparison
        const existingBattleWear = message.getFlag("witch-iron", "battleWear") || { attacker: 0, defender: 0 };
        console.log(`[DEBUG GM] Existing battle wear: ${JSON.stringify(existingBattleWear)}`);
        console.log(`[DEBUG GM] New battle wear: Attacker: ${data.attackerWear}, Defender: ${data.defenderWear}`);
        
        // Get injury data for reference
        const injuryData = message.getFlag("witch-iron", "injuryData");
        if (injuryData) {
            console.log(`[DEBUG GM] Current injury base damage: ${injuryData.damage}`);
        }
    }
    
    // Update the message flags with the new battle wear values
    await message.update({
        "flags.witch-iron.battleWear": {
            attacker: data.attackerWear,
            defender: data.defenderWear,
            location: data.location
        }
    });
    
    console.log(`[DEBUG GM] Message flags updated for message ${data.messageId}`);
    
    // Update the actors
    await updateActorBattleWear(message, data.attackerWear, data.defenderWear, data.location);
    
    console.log(`[DEBUG GM] Actor battle wear updated`);
    
    // Broadcast to all clients that the update is complete
    game.socket.emit("system.witch-iron.battleWearUpdate", {
        messageId: data.messageId,
        attackerWear: data.attackerWear,
        defenderWear: data.defenderWear,
        location: data.location,
        userId: game.user.id,
        completed: true
    });
    
    console.log(`[DEBUG GM] Battle wear update completed and broadcast to clients`);
    
    return true;
}
