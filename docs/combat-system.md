# Witch Iron Combat System

## Initiative and Turn Order

Witch Iron uses a side-based initiative system instead of individual initiative rolls. At the start of combat, a single d6 roll determines which side (players or enemies) acts first:

- On a 1-3, opponents go first
- On a 4-6, the party goes first

Once a side is determined to go first, all characters on that side can take their turns in any order the players/GM decide. After everyone on the first side has acted, all characters on the second side take their turns in any order.

### Settings

The system provides several configuration options in the System Settings menu:

- **Use Side-Based Initiative**: Enable or disable the side-based initiative system. When disabled, Foundry's standard individual initiative system will be used.
- **Player Initiative Value**: The initiative value assigned to player characters when they win initiative.
- **NPC Initiative Value**: The initiative value assigned to NPCs when they win initiative.

### Manual Roll

GMs can also manually trigger a side initiative roll using the provided "Roll Side Initiative" macro. This can be useful for:

- Re-rolling initiative during an ongoing combat
- Rolling initiative when the automatic roll on combat creation fails
- Testing the system

## Combat Workflow

Witch Iron's combat is brutal and detailed, with no hit point tracking. Instead, damage is modeled through injuries and conditions:

1. **Each Round** is ten seconds
2. **Actions** include Attacking, Sprinting, Casting, Readying an Item, etc.
3. **Movement** is up to a character's Speed ability

### Melee Combat
When attacking while you're **Engaged**, make a **Melee Quarrel**. Your opponent may defend against you with **Melee** or **Light-Foot**.

- If your Net Hits are **+0** or more, you **Injure** your opponent
- If your Net Hits are **-1** or less, your opponent **Injures** you when using **Melee** or simply dodges the blow when using **Light-Foot**

### Ranged Combat
When attacking while you're **not Engaged**, make a **Ranged Quarrel**. Your opponent may dodge with the **Light-Foot** skill.

- If your Net Hits are **+0** or more, you **Injure** your opponent
- If your Net Hits are **-1** or less, they dodge

### Injuries and Hit Location
When you strike someone with an attack:

1. The **defender** decides the **hit location**
2. The **attacker** may **spend two Hits** to move the attack one **hit location** away
3. **Area** or **unspecified** damage always hits the **Torso**

### Damage Resolution
1. Consult the appropriate **Hit Location** table
2. Determine the **Injury Location** using the **Units** die of your attack or roll **d10**
3. Determine severity of the **Injury** with your **Net Damage: (Weapon Dmg + Net Hits) - (AV+RB)**

## Advanced Combat Rules

Witch Iron also includes several optional advanced combat rules:

- **Giving Ground**: After dodging, gain +2 Hits but move 10 feet away
- **Charge**: +2 Hits when charging in a straight line
- **Brace**: +2 Hits to defense when taking a defensive stance
- **Dual Wield**: Roll twice against a single defensive roll
- **Mounted Combat**: Benefits for mounted characters
- **Engagement & Overwhelm**: Bonuses when outnumbering opponents
- **Cover**: Protection from attacks
- **Fall Damage**: Falling causes cumulative damage based on distance 