# Witch Iron System for Foundry VTT

![Witch Iron Banner](https://example.com/banner-image.jpg)

A Foundry VTT system implementation for Witch Iron, a brutal dark fantasy RPG about building a legacy through consequence and change.

## Description

Witch Iron is a complex tabletop RPG with unique mechanics that have been carefully integrated into Foundry Virtual Tabletop. This system implements all the distinctive features of the game:

- **Roll-under d100 system** with critical successes and fumbles (on doubles)
- **No-HP combat** - injury-based system with location-specific wounds
- **Side-based initiative system** - a single d6 roll determines which side acts first
- **Opposed combat Quarrels** - streamlined attack and defense mechanics
- **Lineage and Genetic Trait** mechanics for character progression
- **Tiered advancement** with unlockable lineages
- **Magick, Miracle, and Runecrafting** systems
- **Corruption and Stress** systems with consequences
- **Encumbrance** tracking that affects abilities and movement
- **Skill specializations** with increasing effectiveness

## Installation

### Method 1: From Foundry VTT Package Browser

1. Launch Foundry VTT and navigate to the "Add-On Modules" tab
2. Click "Install System"
3. Search for "Witch Iron"
4. Click "Install"

### Method 2: Using the Manifest URL

1. Launch Foundry VTT and navigate to the "Add-On Modules" tab
2. Click "Install System"
3. In the "Manifest URL" field, paste: `https://github.com/ethanrowe/witch-iron/releases/latest/download/system.json`
4. Click "Install"

### Method 3: Manual Installation

1. Download the latest release from [GitHub](https://github.com/ethanrowe/witch-iron/releases)
2. Extract the zip file
3. Place the extracted folder in your Foundry VTT `Data/systems` directory
4. Restart Foundry VTT

## Features

### Character Creation and Management

- Support for all Witch Iron abilities (Muscle, Robustness, Agility, etc.)
- Genetic Trait selection and inheritance system
- Lineage unlocking and tracking
- Injury tracking by body location
- Luck point management for modifying rolls and avoiding death

### Roll System

- Intuitive d100 roll-under mechanics
- Automatic calculation of critical successes (doubles under target)
- Automatic calculation of fumbles (doubles over target)
- Integrated hit calculation based on margin of success
- Skill specialization bonuses

### Combat and Equipment

- Injury-based combat system (no HP tracking)
- Side-based initiative system (see [Combat Documentation](docs/combat-system.md))
- Opposed skill check Quarrels for attacks and defense (see [Combat Quarrels](docs/combat-quarrels.md))
- Support for all weapon types and classifications
- Instant access item management
- Encumbrance tracking with automatic penalties

### Magic and Artifacts

- Arcane, Miracle, and Rune-based spells
- Three-stage artifact progression
- Corruption and Stress risk tracking
- Alchemical item crafting

## Required Modules

None required, but the following modules enhance the experience:

- Dice So Nice! - For 3D dice rolling visualizations
- PopOut! - For detaching character sheets to separate windows
- Token Action HUD - For quick access to character actions

## Credits

**Design, Layout & Writing:** Ethan Rowe  
**Illustration & Cover:** SDXL, edited by Ethan Rowe  
**Editing:** Ethan Rowe & Nick G  
**Play Testing:** Dayton R; Josh W; Nick G; Zach G  
**System Implementation:** [Your Name]

## License

This implementation is licensed under a Creative Commons Attribution 4.0 International License. You are free to share and adapt this material for any purpose, including commercially, as long as you give attribution.

## Support

For bug reports and feature requests, please use the [GitHub issue tracker](https://github.com/ethanrowe/witch-iron/issues). 