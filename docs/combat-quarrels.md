# Witch Iron Combat Quarrels

## Overview

Witch Iron's combat system revolves around opposed skill checks called "Quarrels" - there are no hit points. Instead, success in a Quarrel can lead to injuries with specific severity and location.

## Attack and Defense Mechanics

1. **Attacker Action**: The attacker selects a target and makes an attack roll using either Melee or Ranged skill.
2. **Defender Response**: The defender responds with a defensive roll:
   - Against Melee attacks: Can use either Melee (parry/block) or Light-Foot (dodge)
   - Against Ranged attacks: Can only use Light-Foot (dodge)
3. **Resolution**:
   - If attacker's Net Hits ≥ 0, the attack succeeds and defender is injured
   - If attacker's Net Hits < 0, the attack fails
   - If the defender used Melee and won, the attacker is injured (counter-attack)

## Hit Location System

When an attack successfully lands, the location of the injury is determined automatically:

1. **Location Determination**: The ones digit (last digit) of the attacker's roll determines where the blow lands:
   - 0: Head
   - 1-3: Torso
   - 4, 6: Right Arm
   - 5, 7: Left Arm
   - 8: Right Leg
   - 9: Left Leg

2. **Changing Hit Location**: When an attack succeeds and would injure a defender, the defender can spend 2 Hits (if they have them) to change the hit location to a different body part. This represents a last-moment effort to redirect the blow.

3. **Severity**: The severity of the injury is typically based on the number of Net Hits the attacker achieved (a minimum of 1).

## Using Combat Quarrels

### Character Sheet Attack Buttons

1. On the Skills tab of the character sheet, you'll find attack buttons next to the Melee and Ranged skills.
2. To attack:
   - First target an enemy token (select it on the canvas)
   - Click the appropriate attack button
   - If attacking a PC, they'll be prompted to choose a defense type
   - NPCs will automatically choose the best available defense

### Combat Quarrel Macro

A macro is also available for initiating combat quarrels:

1. Select your token
2. Target an enemy token
3. Run the "Combat Quarrel" macro
4. Select the attack and defense types
5. The system will execute the opposed rolls and display the results
6. Hit location is automatically determined based on the attacker's roll

## Applying Injuries

When a combatant is injured:

1. An "Apply Injury" button appears in the chat message
2. Clicking it opens a dialog to specify:
   - Body location (pre-filled based on the hit location)
   - Injury severity (pre-filled based on Net Hits)
   - Injury description
3. The injury is added to the character's injuries list and appears on their character sheet

## Injury Effects

Injuries have mechanical effects based on their location and severity:

1. **Head Injuries**: Affect Intelligence and Willpower abilities
2. **Torso Injuries**: Affect Robustness and can reduce maximum attacks per round
3. **Arm Injuries**: Affect Melee skill, Muscle and Finesse abilities
   - Dominant hand injuries affect Ranged combat more severely
4. **Leg Injuries**: Affect Agility, Light-Foot skill, and reduce Speed

Injuries can be treated (removing their penalties) or become permanent (reduced penalties but cannot be healed completely).

## Managing Injuries

### Injuries Tab

Each character sheet has an Injuries tab that displays all current injuries:

1. **Injury List**: Shows all injuries with location, severity, and status
2. **Body Map**: Visual representation of injuries by location
3. **Actions**:
   - Treat Injury: Mark an injury as treated, removing its penalties
   - Make Permanent: Convert an injury to a permanent condition (reduced penalties)
   - Delete: Remove an injury completely
   - Add: Manually add a new injury

### Injury Interaction

- Click on any body location in the map to quickly add injuries to that location
- View all injuries for a specific location
- Manage injuries directly from the body map
- See color-coded severity indicators

### Narrative Descriptions

When adding injuries, you can provide detailed descriptions that appear:
- On the character sheet
- In chat messages
- In combat narration

This helps create a more immersive experience where injuries impact both mechanics and storytelling.

## Critical Successes and Fumbles

The combat system accounts for critical successes and fumbles:

- **Critical Success**: Rolls of 01-05 or doubles under the target
  - Grants +6 Hits or +1 Hit (whichever is better)
  - Special effects may apply

- **Fumble**: Rolls of 96-00 or doubles over the target
  - Always -6 Hits
  - Character automatically falls prone
  - May drop weapon or suffer other effects

## Tips for Game Masters

- For meaningful combat, consider giving NPCs appropriate skill values
- Use the "Apply Injury" function to represent specific wounds based on the attack type
- Remember that combatants can be defeated without being killed - surrender, incapacitation, or fleeing are all valid outcomes
- Use the hit location system to create narrative descriptions of combat 