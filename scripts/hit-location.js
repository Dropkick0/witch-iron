/**
 * Hit Location Selection Module for Witch Iron
 */

// Add a log message when this module is loaded
console.log("Witch Iron | Hit Location module loaded");

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
                applyHitCallback: (location, remainingHits) => {
                    // Apply the hit with the selected location and remaining hits
                this._applyHit(
                    data.attacker, 
                    data.defender, 
                    data.damage, 
                    location, 
                    data.messageId, 
                    remainingHits, 
                    data.combatId,
                    data.weaponDmg || 0,  // Pass weapon damage
                    data.soak || 0        // Pass soak
                );
            }
        };
        
        // Get battle wear data if we have attacker and defender names
        if (data.attacker && data.defender) {
            dialogData.battleWear = await this._getBattleWearData(data.attacker, data.defender);
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
        
        // Generic injury effects based on severity and location
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
     * Create an injury message in chat
     * @param {object} combatData The combat data including attacker, defender, location, etc.
     * @private
     */
    static async _createInjuryMessage(combatData) {
        // If preserveDamage flag is set, use the original damage value directly
        if (combatData.preserveDamage) {
            combatData.severity = combatData.originalDamage || combatData.severity;
            console.log(`Preserving original damage value: ${combatData.severity}`);
        } else {
        // Roll a random severity if not provided
        if (!combatData.severity) {
            combatData.severity = Math.floor(Math.random() * 10) + 1;
        }
        
        // If the severity has been recomputed, use that
        if (combatData.recalculatedDamage !== undefined) {
            combatData.severity = combatData.recalculatedDamage;
            }
        }
        
        // Ensure we have a combatId
        if (!combatData.combatId) {
            combatData.combatId = this.generateCombatId();
            console.log(`Generated new combat ID for injury message: ${combatData.combatId}`);
        }
        
        console.log(`Creating injury message for combat ID: ${combatData.combatId} with damage: ${combatData.severity}`);
        
        // Generate a description for the injury based on location and severity
        combatData.description = this._generateInjuryDescription(combatData.location, combatData.severity);
        
        // Generate an effect for the injury based on location and severity
        combatData.effect = HitLocationSelector._generateInjuryEffect(combatData.location.toLowerCase().replace(' ', '-'), combatData.severity);
        
        // Get battle wear data from attacker and defender
        const battleWearData = await this._getBattleWearData(combatData.attacker, combatData.defender);
        
        // Find attacker and defender actors to get their ability bonus and equipment values
        let attackerActor = null;
        let defenderActor = null;
        let attackerAbilityBonus = 3; // default
        let defenderAbilityBonus = 3; // default
        let weaponBonus = 0;
        let armorBonus = 0;
        
        // Try to find actors by name
        if (combatData.attacker) {
            attackerActor = game.actors.find(a => a.name === combatData.attacker);
            if (!attackerActor) {
                // Try to find by token ID if we have it
                if (combatData.attackerTokenId) {
                    const attackerToken = canvas.tokens.get(combatData.attackerTokenId);
                    if (attackerToken) {
                        attackerActor = attackerToken.actor;
                    }
                }
            }
        }
        
        if (combatData.defender) {
            defenderActor = game.actors.find(a => a.name === combatData.defender);
            if (!defenderActor) {
                // Try to find by token ID if we have it
                if (combatData.defenderTokenId) {
                    const defenderToken = canvas.tokens.get(combatData.defenderTokenId);
                    if (defenderToken) {
                        defenderActor = defenderToken.actor;
                    }
                }
            }
        }
        
        // If we found the attacker, get their ability bonus
        if (attackerActor) {
            // Get ability bonus from attacker
            attackerAbilityBonus = attackerActor.system?.derived?.abilityBonus || 3;
            
            // Get weapon bonus from attacker - use effective bonus which accounts for normal battle wear
            weaponBonus = attackerActor.system?.derived?.weaponBonusEffective || 0;
            
            console.log(`Attacker ${combatData.attacker} - Ability: ${attackerAbilityBonus}, Weapon Bonus: ${weaponBonus}`);
        }
        
        if (defenderActor) {
            // Get ability bonus from defender (use Hidden Depths if available)
            defenderAbilityBonus = defenderActor.system?.derived?.abilityBonus || 3;
            
            // Get effective armor bonus (accounts for battle wear)
            armorBonus = defenderActor.system?.derived?.armorBonusEffective || 0;
            
            console.log(`Defender ${combatData.defender} - Ability: ${defenderAbilityBonus}, Effective Armor Bonus: ${armorBonus}`);
        }
        
        // *** IMPORTANT: Use the REMAINING net hits after location adjustments ***
        // If remainingNetHits is provided, use that instead of the original netHits
        // This ensures hits spent on location movement are accounted for
        const netHits = combatData.remainingNetHits !== undefined 
            ? Math.abs(combatData.remainingNetHits) 
            : Math.abs(combatData.netHits || 0);
            
        console.log(`Using remaining net hits for damage calculation: ${netHits} (original: ${combatData.netHits}, remaining: ${combatData.remainingNetHits})`);
        
        // If preserveDamage flag is set, don't recalculate damage
        let netDamage = combatData.severity;
        
        if (!combatData.preserveDamage) {
            // Calculate net damage using correct formula: (Damage + Net Hits) - Soak
            // Where Damage is Ability + Weapon
            const attackerDamage = attackerAbilityBonus + weaponBonus;
            const defenderSoak = defenderAbilityBonus + armorBonus;
            
            // Add the remaining net hits to attacker's damage
            const baseDamage = Math.max(0, (attackerDamage + netHits) - defenderSoak);
            
            // NOW CORRECTLY APPLY BATTLE WEAR:
            // 1. Get initial attacker weapon wear (to be ADDED to damage)
            const attackerWeaponWear = battleWearData?.attacker?.currentWear || 0;
            
            // 2. Calculate net damage with weapon battle wear added
            netDamage = baseDamage + attackerWeaponWear;
            
            console.log(`BASE damage calculation: (${attackerAbilityBonus} ability + ${weaponBonus} weapon + ${netHits} remaining net hits) - (${defenderAbilityBonus} ability + ${armorBonus} armor) = ${baseDamage}`);
            console.log(`FINAL damage with battle wear: ${baseDamage} + ${attackerWeaponWear} weapon wear = ${netDamage}`);
        } else {
            // Even with preserved damage, we need to ensure the combat details reflect accurate values
            // Calculate what the damage would normally be with the formula
            const attackerDamage = attackerAbilityBonus + weaponBonus;
            const defenderSoak = defenderAbilityBonus + armorBonus;
            const calculatedDamage = Math.max(0, (attackerDamage + netHits) - defenderSoak);
            
            console.log(`Using preserved damage ${netDamage}, calculated damage would be: (${attackerAbilityBonus} ability + ${weaponBonus} weapon + ${netHits} remaining net hits) - (${defenderAbilityBonus} ability + ${armorBonus} armor) = ${calculatedDamage}`);
        }
        
        // Format the display text for damage and soak
        const damageText = `${attackerAbilityBonus}(${weaponBonus})`;
        const soakText = `${defenderAbilityBonus}(${armorBonus})`;
        
        // Set the flavor text and message type based on whether the attack was deflected
        const isDeflected = netDamage <= 0;
        const flavor = isDeflected ? "Attack Deflected" : "Combat Injury";
        const messageType = isDeflected ? "deflection" : "injury";
        
        // Render the template and create the chat message
        const content = await renderTemplate("systems/witch-iron/templates/chat/injury-message.hbs", {
            attacker: combatData.attacker,
            defender: combatData.defender,
            location: combatData.location,
            severity: netDamage, // Use our calculated net damage or preserved damage
            damage: netDamage, // Same as severity
            damageText: damageText, // For display in combat details
            soakText: soakText, // For display in combat details
            weapon: weaponBonus || "-",
            soak: defenderAbilityBonus + armorBonus || 0,
            netHits: netHits,
            description: this._generateInjuryDescription(combatData.location, netDamage),
            effect: HitLocationSelector._generateInjuryEffect(combatData.location.toLowerCase().replace(' ', '-'), netDamage),
            isDeflected: isDeflected,
            battleWear: battleWearData,
            // Add new values
            abilityBonus: attackerAbilityBonus,
            weaponBonus: weaponBonus,
            armorBonus: armorBonus,
            combatId: combatData.combatId
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
                        effect: HitLocationSelector._generateInjuryEffect(combatData.location.toLowerCase().replace(' ', '-'), netDamage),
                        netHits: netHits,
                        weaponDmg: weaponBonus,
                        abilityDmg: attackerAbilityBonus,
                        soak: defenderAbilityBonus + armorBonus,
                        abilitySoak: defenderAbilityBonus,
                        armorSoak: armorBonus,
                        combatId: combatData.combatId,
                        messageId: combatData.messageId,
                        preservedDamage: combatData.preserveDamage
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
    static async _getBattleWearData(attackerName, defenderName) {
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
        
        // Default battle wear data
        const battleWearData = {
            attacker: {
                maxWear: 4,
                weaponBonus: 0,
                currentWear: 0,
                tokenImg: "icons/svg/mystery-man.svg"
            },
            defender: {
                maxWear: 4,
                armorBonus: 0,
                currentWear: 0,
                tokenImg: "icons/svg/mystery-man.svg"
            }
        };
        
        // If we found the attacker, get their weapon bonus and token image
        if (attackerActor) {
            // Get weapon bonus and battle wear from the actor's derived data
            if (attackerActor.system?.derived) {
                const actorWeaponWear = attackerActor.system.battleWear?.weapon?.value || 0;
                // Get the actual weapon bonus max from actor's derived data
                const actorWeaponMax = attackerActor.system.derived.weaponBonusMax || 0;
                
                // Display max wear as the weapon bonus max - current wear
                // For injury card, we want to start at 0 and subtract from max
                battleWearData.attacker.maxWear = Math.max(0, actorWeaponMax - actorWeaponWear);
                battleWearData.attacker.weaponBonus = attackerActor.system.derived.weaponBonusEffective || 0;
                battleWearData.attacker.currentWear = 0; // Start at 0 for the injury card
                battleWearData.attacker.actualWear = actorWeaponWear; // Store the actual wear for reference
            } else {
                // Fallback to finding the actor's equipped weapon
            const equippedWeapon = attackerActor.items.find(i => 
                i.type === "weapon" && 
                i.system.equipped
            );
            
            if (equippedWeapon) {
                // Get the weapon's damage bonus as max wear
                    const weaponBonus = parseInt(equippedWeapon.system.damage?.bonus) || 0;
                    battleWearData.attacker.maxWear = weaponBonus;
                    battleWearData.attacker.weaponBonus = weaponBonus;
                battleWearData.attacker.weaponName = equippedWeapon.name;
                }
            }
            
            // Get token image
            if (attackerActor.token) {
                battleWearData.attacker.tokenImg = attackerActor.token.img;
            } else if (attackerActor.prototypeToken) {
                battleWearData.attacker.tokenImg = attackerActor.prototypeToken.texture.src;
            } else {
                battleWearData.attacker.tokenImg = attackerActor.img;
            }
        }
        
        // If we found the defender, get their armor bonus and token image
        if (defenderActor) {
            // Get armor bonus and battle wear from the actor's derived data
            if (defenderActor.system?.derived) {
                const actorArmorWear = defenderActor.system.battleWear?.armor?.value || 0;
                // Get the actual armor bonus max from actor's derived data
                const actorArmorMax = defenderActor.system.derived.armorBonusMax || 0;
                
                // Display max wear as the armor bonus max - current wear
                // For injury card, we want to start at 0 and subtract from max
                battleWearData.defender.maxWear = Math.max(0, actorArmorMax - actorArmorWear);
                battleWearData.defender.armorBonus = defenderActor.system.derived.armorBonusEffective || 0;
                battleWearData.defender.currentWear = 0; // Start at 0 for the injury card
                battleWearData.defender.actualWear = actorArmorWear; // Store the actual wear for reference
            } else {
                // Fallback to finding the actor's equipped armor
            const equippedArmor = defenderActor.items.find(i => 
                i.type === "armor" && 
                i.system.equipped
            );
            
            if (equippedArmor) {
                // Get the armor's soak bonus as max wear
                    const armorBonus = parseInt(equippedArmor.system.soak?.bonus) || 0;
                    battleWearData.defender.maxWear = armorBonus;
                    battleWearData.defender.armorBonus = armorBonus;
                battleWearData.defender.armorName = equippedArmor.name;
                }
            }
            
            // Get token image
            if (defenderActor.token) {
                battleWearData.defender.tokenImg = defenderActor.token.img;
            } else if (defenderActor.prototypeToken) {
                battleWearData.defender.tokenImg = defenderActor.prototypeToken.texture.src;
            } else {
                battleWearData.defender.tokenImg = defenderActor.img;
            }
        }
        
        return battleWearData;
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
        // Create a new injury item
        const injuryData = {
            name: injuryName,
            type: "injury",
            img: "icons/svg/blood.svg",
            system: {
                description: `Injury to the ${location} with ${damage} damage.`,
                location: location,
                severity: {
                    value: damage, // Use the exact damage value
                    label: damage < 4 ? "Minor" : damage < 7 ? "Major" : "Severe"
                },
                effect: injuryEffect
            }
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
    static _generateInjuryDescription(location, severity) {
        let severityLabel = "Minor";
        if (severity >= 7) {
            severityLabel = "Severe";
        } else if (severity >= 4) {
            severityLabel = "Major";
        } else if (severity === 0) {
            return `Attack Deflected by ${location}`;
        }
        
        return `${severityLabel} ${location} Injury`;
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

// Register a specific hook for injury message rendering
Hooks.on("renderChatMessage", (message, html, data) => {
    // Check if this is an injury message
    const messageType = message.getFlag("witch-iron", "messageType");
    if (messageType === "injury" || messageType === "deflection") {
        console.log(`Detected injury message being rendered: ${message.id}`);
        
        // Short delay to ensure DOM is fully rendered
        setTimeout(() => {
            // Attach event handlers
            attachInjuryMessageHandlers(message.id);
        }, 50);
    }
});

/**
 * Apply battle wear to the attacker's weapon and defender's armor
 * @param {ChatMessage} message The chat message with battle wear
 * @param {number} attackerWear Amount of battle wear for attacker's weapon
 * @param {number} defenderWear Amount of battle wear for defender's armor
 */
async function applyBattleWear(message, attackerWear, defenderWear) {
    try {
        // Log the battle wear application
    console.log(`Applying battle wear: ${attackerWear} to attacker's weapon, ${defenderWear} to defender's armor`);
        console.log("Message object:", message);
        
        // Input validation
        if (!message) {
            console.warn("No message provided to applyBattleWear");
            ui.notifications.warn("Could not apply battle wear: No message provided");
            return;
        }
        
        // Convert wear values to numbers and ensure they're non-negative
        attackerWear = Math.max(0, parseInt(attackerWear) || 0);
        defenderWear = Math.max(0, parseInt(defenderWear) || 0);
        
        // If both wear values are 0, nothing to do
        if (attackerWear === 0 && defenderWear === 0) {
            console.log("No battle wear to apply");
            return;
        }
        
        // Initialize variables for attacker and defender names
        let attackerName = "Attacker";
        let defenderName = "Defender";
        
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
        
        // Apply battle wear to the attacker's weapon
        if (attackerActor && attackerWear > 0) {
            // Get the current battle wear value
            const currentWear = attackerActor.system?.battleWear?.weapon?.value || 0;
            console.log(`Attacker's current weapon wear: ${currentWear}`);
            
            // Calculate max wear value from actor's derived data
            const maxWear = attackerActor.system?.derived?.weaponBonusMax || 0;
            console.log(`Attacker's max weapon wear: ${maxWear}`);
            
            // Calculate new battle wear (don't exceed max value)
            const newWear = Math.min(maxWear, Math.max(0, currentWear + attackerWear));
            console.log(`Calculated new wear: ${newWear} (current ${currentWear} + increase ${attackerWear}, max ${maxWear})`);
            
            // Only update if there's an actual change
            if (newWear !== currentWear) {
                try {
                    // Update the actor with the new battle wear value
                    await attackerActor.update({
                        'system.battleWear.weapon.value': newWear
                    });
                    
                    console.log(`Updated attacker's weapon wear to ${newWear}`);
                    ui.notifications.info(`Applied ${attackerWear} battle wear to ${attackerName}'s weapon (${currentWear} → ${newWear})`);
                    
                    // Make sure changes are reflected in UI
                    attackerActor.render(false);
                    if (attackerActor.sheet?.rendered) {
                        attackerActor.sheet.render(true);
                    }
                } catch (error) {
                    console.error("Error updating attacker battle wear:", error);
                    ui.notifications.error(`Error applying battle wear to ${attackerName}: ${error.message}`);
                }
            } else {
                console.log("No change to attacker's weapon wear needed");
            }
        }
        
        // Apply battle wear to the defender's armor
        if (defenderActor && defenderWear > 0) {
            // Get the current battle wear value
            const currentWear = defenderActor.system?.battleWear?.armor?.value || 0;
            console.log(`Defender's current armor wear: ${currentWear}`);
            
            // Calculate max wear value from actor's derived data
            const maxWear = defenderActor.system?.derived?.armorBonusMax || 0;
            console.log(`Defender's max armor wear: ${maxWear}`);
            
            // Calculate new battle wear (don't exceed max value)
            const newWear = Math.min(maxWear, Math.max(0, currentWear + defenderWear));
            console.log(`Calculated new wear: ${newWear} (current ${currentWear} + increase ${defenderWear}, max ${maxWear})`);
            
            // Only update if there's an actual change
            if (newWear !== currentWear) {
                try {
                    // Update the actor with the new battle wear value
                    await defenderActor.update({
                        'system.battleWear.armor.value': newWear
                    });
                    
                    console.log(`Updated defender's armor wear to ${newWear}`);
                    ui.notifications.info(`Applied ${defenderWear} battle wear to ${defenderName}'s armor (${currentWear} → ${newWear})`);
                    
                    // Make sure changes are reflected in UI
                    defenderActor.render(false);
                    if (defenderActor.sheet?.rendered) {
                        defenderActor.sheet.render(true);
                    }
                } catch (error) {
                    console.error("Error updating defender battle wear:", error);
                    ui.notifications.error(`Error applying battle wear to ${defenderName}: ${error.message}`);
                }
            } else {
                console.log("No change to defender's armor wear needed");
            }
        }
        
        // Disable the battle wear buttons after applying if we have the message element
    if (messageElement) {
        const battleWearButtons = messageElement.querySelectorAll('.battle-wear-plus, .battle-wear-minus');
        battleWearButtons.forEach(button => {
            button.disabled = true;
        });
            
            console.log(`Disabled ${battleWearButtons.length} battle wear buttons`);
        
        // Hide the create injury button
        const createInjuryButton = messageElement.querySelector('.create-injury');
        if (createInjuryButton) {
            createInjuryButton.style.display = 'none';
                console.log("Hidden create injury button");
            }
        }
        
        return { attackerActor, defenderActor };
    } catch (error) {
        console.error("Error in applyBattleWear:", error);
        ui.notifications.error(`Error applying battle wear: ${error.message}`);
        return null;
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
            classes: ["witch-iron", "hit-location-dialog"],
            resizable: true
        });
    }
    
    /** @override */
    getData(options={}) {
        return {
            defenderName: this.data.defenderName || "Target",
            damageAmount: this.data.damageAmount || 0,
            netHits: this.netHits
        };
    }

    /**
     * Move to the attacker phase where they can spend net hits to adjust location
     * @param {string} initialLocation The initially selected location
     */
    moveToAttackerPhase(initialLocation) {
        console.log("Moving to attacker phase");
        this.phase = "attacker";
        
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
        this.element.find('.attacker-phase, .attacker-buttons').css('display', 'block');
        
        // Update available move buttons
        this.updateAvailableMoves();
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
        
        // Enable adjacent locations if we have enough hits
        if (this.remainingHits >= this.moveCost) {
            adjacentLocations.forEach(loc => {
                // Highlight available locations on the body
                this.element.find(`.body-part[data-location="${loc}"]`).addClass('available');
                
                // Also highlight the labels
                this.element.find(`.location-label[data-location="${loc}"]`).addClass('available');
            });
        }
        
        // Enable/disable undo button
        const undoButton = this.element.find('.undo-move-btn');
        if (this.moveHistory.length > 0) {
            undoButton.removeAttr('disabled');
        } else {
            undoButton.attr('disabled', true);
        }
    }
    
    /**
     * Move the hit location to a new location
     * @param {string} targetLocation The new location
     */
    moveLocation(targetLocation) {
        if (!this.selectedLocation) return;
        
        // Check if the move is valid
        const adjacentLocations = this.adjacencyMap[this.selectedLocation] || [];
        if (!adjacentLocations.includes(targetLocation) || this.remainingHits < this.moveCost) {
            console.warn(`Invalid move from ${this.selectedLocation} to ${targetLocation}`);
            return;
        }
        
        // Record the move in history for undo
        this.moveHistory.push(this.selectedLocation);
        
        // Update remaining hits
        this.remainingHits -= this.moveCost;
        this.element.find('#net-hits-remaining').text(this.remainingHits);
        
        // Select the new location
        this.selectLocationInAttackerPhase(targetLocation);
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
        
        // Update available moves
        this.updateAvailableMoves();
    }
    
    /**
     * Undo the last move
     */
    undoMove() {
        if (this.moveHistory.length === 0) return;
        
        // Get the previous location
        const previousLocation = this.moveHistory.pop();
        
        // Refund the net hits
        this.remainingHits += this.moveCost;
        this.element.find('#net-hits-remaining').text(this.remainingHits);
        
        // Select the previous location
        this.selectLocationInAttackerPhase(previousLocation);
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
                if (adjacentLocations.includes(location) && this.remainingHits >= this.moveCost) {
                    this.moveLocation(location);
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
                if (adjacentLocations.includes(location) && this.remainingHits >= this.moveCost) {
                    this.moveLocation(location);
                }
            }
        });
        
        // Undo button for attacker phase
        const undoButton = html.find('.undo-move-btn');
        undoButton.on('click', (event) => {
            event.preventDefault();
            this.undoMove();
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
    let damage = injuryData.damage || 1;
    
    // Ensure net hits is a positive number and represents the REMAINING hits after location adjustments
    const netHits = Math.abs(injuryData.netHits || 0);
    console.log(`Using net hits value: ${netHits} (from injury data - this should be REMAINING hits after location moves)`);
    
    const effect = injuryData.effect || "";
    
    console.log(`Injury data: damage=${damage}, netHits=${netHits}, location=${location}`);
    
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
        // Get battle wear data from the message
        const attackerWearElement = messageElement.querySelector('.attacker-wear .battle-wear-value');
        const defenderWearElement = messageElement.querySelector('.defender-wear .battle-wear-value');
        
        let attackerWear = 0;
        let defenderWear = 0;
        
        if (attackerWearElement) {
            attackerWear = parseInt(attackerWearElement.textContent) || 0;
        }
        
        if (defenderWearElement) {
            defenderWear = parseInt(defenderWearElement.textContent) || 0;
        }
        
        // Apply battle wear first to track equipment wear
        console.log(`Applying battle wear after injury: Attacker ${attackerWear}, Defender ${defenderWear}`);
        await applyBattleWear(message, attackerWear, defenderWear);
        
        // MODIFIED DAMAGE CALCULATION:
        // Calculate the base damage using the formula, including remaining net hits
        let baseDamage = damage;
        
        // Log the components of our damage calculation for clarity
        const attackerDamage = injuryData.abilityDmg || 3;  // Ability damage
        const weaponDamage = injuryData.weaponDmg || 0;     // Weapon damage
        const defenderSoak = injuryData.soak || 0;          // Total soak
        
        console.log(`Damage components: Ability(${attackerDamage}) + Weapon(${weaponDamage}) + NetHits(${netHits}) - Soak(${defenderSoak})`);
        
        // 1. Add the attacker's weapon battle wear directly to the damage
        const damageWithWeaponWear = baseDamage + attackerWear;
        console.log(`Base damage ${baseDamage} + weapon wear ${attackerWear} = ${damageWithWeaponWear}`);
        
        // 2. Only roll armor dice if there's defender battle wear
        let armorRollResult = 0;
        let finalDamage = damageWithWeaponWear;
        let armorRoll = null;
        
        if (defenderWear > 0) {
            // Create a roll for armor battle wear dice
            armorRoll = await new Roll(`${defenderWear}d6`).evaluate({async: true});
            armorRollResult = armorRoll.total;
            
            // Subtract the armor roll from the damage (can't go below 0)
            finalDamage = Math.max(0, damageWithWeaponWear - armorRollResult);
            
            console.log(`Rolled ${defenderWear}d6 for armor and got ${armorRollResult}. Final damage: ${finalDamage}`);
            
            // Display the armor roll
            await armorRoll.toMessage({
                flavor: `${defenderName}'s Armor Battle Wear Roll`,
                speaker: ChatMessage.getSpeaker(),
                content: `<div class="armor-roll-result">
                    <div>Base Damage: ${baseDamage}</div>
                    <div>After Weapon Wear (+${attackerWear}): ${damageWithWeaponWear}</div>
                    <div>Armor Roll (${defenderWear}d6): ${armorRollResult}</div>
                    <div>Final Damage: ${finalDamage}</div>
                    <div class="small-note">Remaining Net Hits: ${netHits}</div>
                </div>`
            });
            
            // Create a short follow-up injury card for the armor battle wear result
            await createArmorBattleWearResultMessage(injuryData, finalDamage, armorRollResult, combatId);
        }
        
        // Generate injury name based on location and severity
        let severityLabel = "Minor";
        if (finalDamage >= 7) {
            severityLabel = "Severe";
        } else if (finalDamage >= 4) {
            severityLabel = "Major";
        } else if (finalDamage <= 0) {
            severityLabel = "Deflected";
        }
        
        const injuryName = finalDamage > 0 ? 
            `${severityLabel} ${location} Injury` : 
            `Attack Deflected by ${location}`;
        
        // Generate effect based on location and severity
        const injuryEffect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), finalDamage);
        
        // Only create the injury if damage > 0
        if (finalDamage > 0) {
        // Create the injury item
            await HitLocationSelector._createInjuryItem(defenderActor, injuryName, location, finalDamage, injuryEffect);
        
        console.log(`Created injury "${injuryName}" for ${defenderName}`);
        ui.notifications.info(`Injury "${injuryName}" added to ${defenderName}.`);
        } else {
            console.log(`Attack deflected by ${defenderName}'s armor roll (${armorRollResult})`);
            ui.notifications.info(`Attack deflected by ${defenderName}'s armor.`);
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
    }
}

/**
 * Creates a simple follow-up message for armor battle wear rolls
 * @param {Object} injuryData The original injury data
 * @param {number} finalDamage The final damage after armor roll
 * @param {number} armorRoll The armor roll result
 * @param {string} combatId The combat workflow ID
 */
async function createArmorBattleWearResultMessage(injuryData, finalDamage, armorRoll, combatId) {
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
    const flavor = finalDamage <= 0 ? "Attack Deflected by Armor" : "Armor Reduced Injury";
    
    // Generate effect based on location and final damage
    const location = injuryData.location;
    const effect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), finalDamage);
    
    // Create HTML content for the message
    const content = `
    <div class="witch-iron chat-card armor-result-card ${finalDamage <= 0 ? 'deflected' : ''}">
        <div class="card-header">
            <i class="fas ${finalDamage <= 0 ? 'fa-shield-alt' : 'fa-tint'}"></i>
            <h3>${finalDamage <= 0 ? 'Attack Deflected!' : 'Final Injury'}</h3>
        </div>
        <div class="card-content">
            <div class="armor-roll-result">
                <div class="armor-roll-row">
                    <span class="armor-label">Original Damage:</span>
                    <span class="armor-value">${injuryData.damage}</span>
                </div>
                <div class="armor-roll-row">
                    <span class="armor-label">Armor Roll:</span>
                    <span class="armor-value">${armorRoll}</span>
                </div>
                <div class="armor-roll-row final-damage">
                    <span class="armor-label">Final Damage:</span>
                    <span class="armor-value">${finalDamage}</span>
                </div>
            </div>
            
            ${finalDamage <= 0 ? `
            <div class="deflected-message">
                <div class="deflected-text">Deflected!</div>
                <div class="deflected-location">Attack deflected by ${injuryData.defender}'s armor</div>
            </div>
            ` : `
            <div class="injury-container">
                <div class="injury-header">
                    <h4>Final Injury</h4>
                </div>
                <div class="injury-row">
                    <div class="severity-col">${finalDamage}</div>
                    <div class="location-col">${location}</div>
                    <div class="effect-col">${effect}</div>
                </div>
                <div class="injury-description">
                    ${severityLabel} ${location} Injury
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
        speaker: ChatMessage.getSpeaker({alias: `${injuryData.defender}'s Armor Result`}),
        flavor: flavor,
        flags: {
            "witch-iron": {
                messageType: finalDamage <= 0 ? "deflection" : "injury",
                combatId: combatId,
                isArmorResult: true,
                injuryData: {
                    attacker: injuryData.attacker,
                    defender: injuryData.defender,
                    location: location,
                    damage: finalDamage,
                    effect: effect,
                    combatId: combatId,
                    originalDamage: injuryData.damage,
                    armorRoll: armorRoll
                }
            }
        }
    });
    
    console.log(`Created armor battle wear result message (${message.id}) for combat ID: ${combatId}`);
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
    const effect = HitLocationSelector._generateInjuryEffect(location.toLowerCase().replace(' ', '-'), exactDamage);
    
    // Update the injury display in the main card area
    updateInjuryDisplay(cardElement, exactDamage, location, effect, exactSeverity);
    
    // Update the button's dataset to reflect the new damage
    const injuryButton = cardElement.querySelector('.create-injury');
    if (injuryButton) {
        // Update the severity attribute to use the calculated damage
        injuryButton.dataset.severity = exactDamage.toString();
        
        // Update the description attribute
        const severityLabel = exactSeverity === "Deflected" ? "Deflected" : `${exactSeverity} ${location} Injury`;
        injuryButton.dataset.description = severityLabel;
        
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
    let deflectedMessage = cardElement.querySelector('.deflected-message');
    
    // If we have 0 damage, show deflected
    if (damage <= 0) {
        // Create or show deflected message
        if (!deflectedMessage) {
            if (injuryContainer) {
                // Replace injury container with deflected message
                deflectedMessage = document.createElement('div');
                deflectedMessage.className = 'deflected-message';
                injuryContainer.parentNode.replaceChild(deflectedMessage, injuryContainer);
            } else {
                // Create new deflected message
                deflectedMessage = document.createElement('div');
                deflectedMessage.className = 'deflected-message';
                
                // Find where to insert it
                const injuryButton = cardElement.querySelector('.create-injury');
                if (injuryButton) {
                    injuryButton.parentNode.insertBefore(deflectedMessage, injuryButton);
                } else {
                    const cardContent = cardElement.querySelector('.card-content');
                    if (cardContent) {
                        cardContent.appendChild(deflectedMessage);
                    }
                }
            }
        }
        
        // Update deflected message content
        deflectedMessage.innerHTML = `
            <div class="deflected-text">Deflected!</div>
            <div class="deflected-location">0 Damage to the ${location}</div>
        `;
        
        // Hide injury container if it exists
        if (injuryContainer) {
            injuryContainer.style.display = 'none';
        }
    } else {
        // We have damage, show injury
        if (!injuryContainer) {
            if (deflectedMessage) {
                // Replace deflected with injury container
                injuryContainer = document.createElement('div');
                injuryContainer.className = 'injury-container';
                deflectedMessage.parentNode.replaceChild(injuryContainer, deflectedMessage);
            } else {
                // Create new injury container
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
        
        // Hide deflected message if it exists
        if (deflectedMessage) {
            deflectedMessage.style.display = 'none';
        }
    }
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
        newBtn.addEventListener('click', (event) => {
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
            } else {
                defenderWear = isPlus ? defenderWear + 1 : Math.max(0, defenderWear - 1);
                if (defenderWearEl) defenderWearEl.textContent = defenderWear;
            }
            
            // Update injury display based on new wear values
            updatePotentialInjury(messageElement);
            
            // Enable/disable buttons based on current values
            updateBattleWearButtons(messageElement);
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