/**
 * Injury Tables Module for Witch Iron
 * This module contains detailed hit location tables for specific injuries
 */

// Add a log message when this module is loaded
console.log("Witch Iron | Injury Tables module loaded");

/**
 * Detailed injury tables for each general hit location
 * Each table maps a d10 roll to a specific hit location and effect
 * 
 * Format:
 * - Key: Roll value (1-10)
 * - Value: Object with:
 *   - location: Specific hit location name
 *   - side: "L" (left), "R" (right), or null
 *   - effects: Object mapping severity to effects
 *     - minor: Effect for minor injury (1-3 damage)
 *     - major: Effect for major injury (4-6 damage)
 *     - severe: Effect for severe injury (7+ damage)
 *     - lethal: Effect for lethal injury (10+ damage or specific conditions)
 */
export const InjuryTables = {
    // Head injury table - RESTRUCTURED
    head: {
        1: { // Nose
            location: "Nose",
            effects: [
                { dmg: 1, effect: "Swollen Nose, Pain 1" },
                { dmg: 2, effect: "Nose Slash, Bleed 1" },
                { dmg: 3, effect: "Lose Smell, Trauma 2" },
                { dmg: 4, effect: "Nostril Ripped, Pain 2" },
                { dmg: 5, effect: "Bridge Gash, Bleed 2" },
                { dmg: 6, effect: "Bent & Broken, Pain 2‡" },
                { dmg: 7, effect: "Split Down Middle, Bleed 3" },
                { dmg: 8, effect: "Mangled, Lost Nose|Pain 2‡" },
                { dmg: 9, effect: "Removed, Lost Nose|Bleed 3" },
                { dmg: 10, effect: "Driven into Brain, Dead" }
            ]
        },
        2: { // Jaw
            location: "Jaw",
            effects: [
                { dmg: 1, effect: "Swollen Cheek, Pain 1" },
                { dmg: 2, effect: "Missing Teeth, Pain 2|d10 Lost" },
                { dmg: 3, effect: "Gushing Mouth, Bleed 1" },
                { dmg: 4, effect: "Hard Hit, Fall Prone" },
                { dmg: 5, effect: "Dislocated Jaw, Pain 2" },
                { dmg: 6, effect: "Tongue Cut, Speechless*" },
                { dmg: 7, effect: "Broken Jaw, Trauma 3‡" },
                { dmg: 8, effect: "Out Cold, Helpless 3" },
                { dmg: 9, effect: "Detached, Lost Jaw‡|Bleed 3" },
                { dmg: 10, effect: "Straight to Brain Stem, Dead" }
            ]
        },
        3: { // Ear L
            location: "Ear",
            side: "L",
            effects: [
                { dmg: 1, effect: "Tenderized Ear, Deaf 2" },
                { dmg: 2, effect: "Ear Infection, Pain 1" },
                { dmg: 3, effect: "Cauliflower Ear, Deaf 3" },
                { dmg: 4, effect: "Discombobulated, Stun 1" },
                { dmg: 5, effect: "Tinnitus, Deaf 2‡" },
                { dmg: 6, effect: "Half-Severed, Bleed 2" },
                { dmg: 7, effect: "Ear Drum Burst, Stun 2" },
                { dmg: 8, effect: "Ripped Off, Lost Ear|Bleed 2" },
                { dmg: 9, effect: "Hearing Loss, Deaf 4‡" },
                { dmg: 10, effect: "…And Out the Other, Dead" }
            ]
        },
        4: { // Ear R
            location: "Ear",
            side: "R",
            effects: [ // Assuming same effects as Left Ear
                { dmg: 1, effect: "Tenderized Ear, Deaf 2" },
                { dmg: 2, effect: "Ear Infection, Pain 1" },
                { dmg: 3, effect: "Cauliflower Ear, Deaf 3" },
                { dmg: 4, effect: "Discombobulated, Stun 1" },
                { dmg: 5, effect: "Tinnitus, Deaf 2‡" },
                { dmg: 6, effect: "Half-Severed, Bleed 2" },
                { dmg: 7, effect: "Ear Drum Burst, Stun 2" },
                { dmg: 8, effect: "Ripped Off, Lost Ear|Bleed 2" },
                { dmg: 9, effect: "Hearing Loss, Deaf 4‡" },
                { dmg: 10, effect: "…And Out the Other, Dead" }
            ]
        },
        5: { // Eye L
            location: "Eye",
            side: "L",
            effects: [
                { dmg: 1, effect: "Black Eye, Blind 1" },
                { dmg: 2, effect: "Sliced Brow, Bleed 1" },
                { dmg: 3, effect: "Double-Vision, Blind 2" },
                { dmg: 4, effect: "Cut Orbit, Bleed 2" },
                { dmg: 5, effect: "Swollen Shut, Blind 3" },
                { dmg: 6, effect: "Lid Removed, Pain 2*" },
                { dmg: 7, effect: "Severe Injury, Blind 4" },
                { dmg: 8, effect: "Popped Out, Lost Eye‡" },
                { dmg: 9, effect: "Destroyed, Lost Eye|Bleed 4" },
                { dmg: 10, effect: "Run Through, Brain Dead" }
            ]
        },
        6: { // Eye R
            location: "Eye",
            side: "R",
            effects: [ // Assuming same effects as Left Eye
                { dmg: 1, effect: "Black Eye, Blind 1" },
                { dmg: 2, effect: "Sliced Brow, Bleed 1" },
                { dmg: 3, effect: "Double-Vision, Blind 2" },
                { dmg: 4, effect: "Cut Orbit, Bleed 2" },
                { dmg: 5, effect: "Swollen Shut, Blind 3" },
                { dmg: 6, effect: "Lid Removed, Pain 2*" },
                { dmg: 7, effect: "Severe Injury, Blind 4" },
                { dmg: 8, effect: "Popped Out, Lost Eye‡" },
                { dmg: 9, effect: "Destroyed, Lost Eye|Bleed 4" },
                { dmg: 10, effect: "Run Through, Brain Dead" }
            ]
        },
        7: { // Skull (Roll 9-10 on Head table)
            location: "Skull",
            effects: [
                { dmg: 1, effect: "Vision Blurred, Blind 1" },
                { dmg: 2, effect: "Shocked, Stun 1" },
                { dmg: 3, effect: "Brain Bruised, Pain 2" },
                { dmg: 4, effect: "Amnesia, Stun 2|Forget d6 min" },
                { dmg: 5, effect: "Black Out, Helpless 1" },
                { dmg: 6, effect: "Concussion, Stun 3" },
                { dmg: 7, effect: "Out Cold, Helpless 2" },
                { dmg: 8, effect: "Brain Damage, Pain 5‡" },
                { dmg: 9, effect: "Skull Fracture, Helpless 5‡" },
                { dmg: 10, effect: "Brain Destroyed, Dead" }
            ]
        },
        8: { // Neck (Roll 7-8 on Head table)
            location: "Neck",
            effects: [
                { dmg: 1, effect: "Bruised Neck, Pain 1" },
                { dmg: 2, effect: "Nicked Throat, Bleed 2" },
                { dmg: 3, effect: "Whiplash, Pain 2" },
                { dmg: 4, effect: "Gashed Neck, Bleed 3" },
                { dmg: 5, effect: "Gasping, Stun 1" },
                { dmg: 6, effect: "Open Wound, Bleed 4" },
                { dmg: 7, effect: "Larynx Shut, Speechless‡" },
                { dmg: 8, effect: "Trachea Injury, Suffocate*" },
                { dmg: 9, effect: "Broken Neck, Helpless 5‡" },
                { dmg: 10, effect: "Head Torn Off, Dead" }
            ]
        },
        9: { // Skull (Roll 9-10 on Head table) - Duplicate entry for roll 9
             location: "Skull",
             effects: [ // Same as roll 7
                 { dmg: 1, effect: "Vision Blurred, Blind 1" },
                 { dmg: 2, effect: "Shocked, Stun 1" },
                 { dmg: 3, effect: "Brain Bruised, Pain 2" },
                 { dmg: 4, effect: "Amnesia, Stun 2|Forget d6 min" },
                 { dmg: 5, effect: "Black Out, Helpless 1" },
                 { dmg: 6, effect: "Concussion, Stun 3" },
                 { dmg: 7, effect: "Out Cold, Helpless 2" },
                 { dmg: 8, effect: "Brain Damage, Pain 5‡" },
                 { dmg: 9, effect: "Skull Fracture, Helpless 5‡" },
                 { dmg: 10, effect: "Brain Destroyed, Dead" }
             ]
         },
        10: { // Skull (Roll 9-10 on Head table) - Duplicate entry for roll 10
             location: "Skull",
             effects: [ // Same as roll 7
                 { dmg: 1, effect: "Vision Blurred, Blind 1" },
                 { dmg: 2, effect: "Shocked, Stun 1" },
                 { dmg: 3, effect: "Brain Bruised, Pain 2" },
                 { dmg: 4, effect: "Amnesia, Stun 2|Forget d6 min" },
                 { dmg: 5, effect: "Black Out, Helpless 1" },
                 { dmg: 6, effect: "Concussion, Stun 3" },
                 { dmg: 7, effect: "Out Cold, Helpless 2" },
                 { dmg: 8, effect: "Brain Damage, Pain 5‡" },
                 { dmg: 9, effect: "Skull Fracture, Helpless 5‡" },
                 { dmg: 10, effect: "Brain Destroyed, Dead" }
             ]
         }
    },

    // Eye injury table (based on the image for location 3-6 in the Eye section)
    eye: {
        1: { 
            location: "Black Eye", 
            effects: {
                minor: "Blind 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        2: { 
            location: "Sliced Brow", 
            effects: {
                minor: "Bleed 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        3: { 
            location: "Double-Vision", 
            effects: {
                minor: "Blind 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        4: { 
            location: "Cut Orbit", 
            effects: {
                minor: "Bleed 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        5: { 
            location: "Swollen Shut", 
            effects: {
                minor: "Blind 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        6: { 
            location: "Lid Removed", 
            effects: {
                minor: "Pain 4",
                major: null,
                severe: null,
                lethal: null
            }
        },
        7: { 
            location: "Severe Injury", 
            effects: {
                minor: "Blind 4",
                major: null,
                severe: null,
                lethal: null
            }
        },
        8: { 
            location: "Popped Out", 
            effects: {
                minor: "Lost Eye",
                major: null,
                severe: null,
                lethal: null
            }
        },
        9: { 
            location: "Destroyed", 
            effects: {
                minor: "Lost Eye|Bleed 4",
                major: null,
                severe: null,
                lethal: null
            }
        },
        10: { 
            location: "Run Through", 
            effects: {
                minor: "Brain Dead",
                major: null,
                severe: null,
                lethal: null
            }
        }
    },

    // Jaw injury table (based on the image for location 2 in the Jaw section)
    jaw: {
        1: { 
            location: "Swollen Cheek", 
            effects: {
                minor: "Pain 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        2: { 
            location: "Missing Teeth", 
            effects: {
                minor: "Pain 1|1d10 Lost",
                major: null,
                severe: null,
                lethal: null
            }
        },
        3: { 
            location: "Gashing Mouth", 
            effects: {
                minor: "Bleed 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        4: { 
            location: "Hard Hit", 
            effects: {
                minor: "Fall Prone",
                major: null,
                severe: null,
                lethal: null
            }
        },
        5: { 
            location: "Dislocated Jaw", 
            effects: {
                minor: "Pain 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        6: { 
            location: "Tongue Cut", 
            effects: {
                minor: "Speechless",
                major: null,
                severe: null,
                lethal: null
            }
        },
        7: { 
            location: "Broken Jaw", 
            effects: {
                minor: "Trauma 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        8: { 
            location: "Out Cold", 
            effects: {
                minor: "Helpless 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        9: { 
            location: "Detached", 
            effects: {
                minor: "Lost Jaw|Bleed 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        10: { 
            location: "Straight to Brain Stem", 
            effects: {
                minor: "Dead",
                major: null,
                severe: null,
                lethal: null
            }
        }
    },

    // Ear injury table (based on the image for location 3-4 in the Ear section)
    ear: {
        1: { 
            location: "Tenderized Ear", 
            effects: {
                minor: "Deaf 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        2: { 
            location: "Ear Infection", 
            effects: {
                minor: "Pain 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        3: { 
            location: "Cauliflower Ear", 
            effects: {
                minor: "Deaf 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        4: { 
            location: "Discombobulated", 
            effects: {
                minor: "Stun 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        5: { 
            location: "Tinnitus", 
            effects: {
                minor: "Deaf 2‡",
                major: null,
                severe: null,
                lethal: null
            }
        },
        6: { 
            location: "Half-Severed", 
            effects: {
                minor: "Bleed 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        7: { 
            location: "Ear Drum Burst", 
            effects: {
                minor: "Stun 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        8: { 
            location: "Ripped Off", 
            effects: {
                minor: "Lost Ear|Bleed 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        9: { 
            location: "Hearing Loss", 
            effects: {
                minor: "Deaf 4‡",
                major: null,
                severe: null,
                lethal: null
            }
        },
        10: { 
            location: "…And Out the Other", 
            effects: {
                minor: "Dead",
                major: null,
                severe: null,
                lethal: null
            }
        }
    },

    // Neck injury table (from the image in the Neck section)
    neck: {
        1: { 
            location: "Bruised Neck", 
            effects: {
                minor: "Pain 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        2: { 
            location: "Nicked Throat", 
            effects: {
                minor: "Bleed 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        3: { 
            location: "Whiplash", 
            effects: {
                minor: "Pain 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        4: { 
            location: "Gashed Neck", 
            effects: {
                minor: "Bleed 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        5: { 
            location: "Gasping", 
            effects: {
                minor: "Stun 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        6: { 
            location: "Open Wound", 
            effects: {
                minor: "Bleed 4",
                major: null,
                severe: null,
                lethal: null
            }
        },
        7: { 
            location: "Larynx Shut", 
            effects: {
                minor: "Speechless‡",
                major: null,
                severe: null,
                lethal: null
            }
        },
        8: { 
            location: "Trachea Injury", 
            effects: {
                minor: "Suffocate",
                major: null,
                severe: null,
                lethal: null
            }
        },
        9: { 
            location: "Broken Neck", 
            effects: {
                minor: "Helpless 5‡",
                major: null,
                severe: null,
                lethal: null
            }
        },
        10: { 
            location: "Head Torn Off", 
            effects: {
                minor: "Dead",
                major: null,
                severe: null,
                lethal: null
            }
        }
    },

    // Skull injury table (from the image in the Skull section)
    skull: {
        1: { 
            location: "Vision Blurred", 
            effects: {
                minor: "Blind 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        2: { 
            location: "Shocked", 
            effects: {
                minor: "Stun 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        3: { 
            location: "Brain Bruised", 
            effects: {
                minor: "Pain 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        4: { 
            location: "Amnesia", 
            effects: {
                minor: "Stun 3|Forget 4d min",
                major: null,
                severe: null,
                lethal: null
            }
        },
        5: { 
            location: "Black Out", 
            effects: {
                minor: "Helpless 1",
                major: null,
                severe: null,
                lethal: null
            }
        },
        6: { 
            location: "Concussion", 
            effects: {
                minor: "Stun 3",
                major: null,
                severe: null,
                lethal: null
            }
        },
        7: { 
            location: "Out Cold", 
            effects: {
                minor: "Helpless 2",
                major: null,
                severe: null,
                lethal: null
            }
        },
        8: { 
            location: "Brain Damage", 
            effects: {
                minor: "Pain 4‡",
                major: null,
                severe: null,
                lethal: null
            }
        },
        9: { 
            location: "Skull Fracture", 
            effects: {
                minor: "Helpless 5‡",
                major: null,
                severe: null,
                lethal: null
            }
        },
        10: { 
            location: "Brain Destroyed", 
            effects: {
                minor: "Dead",
                major: null,
                severe: null,
                lethal: null
            }
        }
    },

    // Torso table (Example structure, needs filling from markdown)
    torso: {
        1: { // Shoulder L
            location: "Shoulder", 
            side: "L", 
            effects: [
                { dmg: 1, effect: "Tenderized, Pain 1" },
                { dmg: 2, effect: "Beaten, Disarm" },
                { dmg: 3, effect: "Chipped, Pain 2" },
                { dmg: 4, effect: "Torn Rotator Cuff, Trauma 1" },
                { dmg: 5, effect: "Nerve Damage, Disarm|Pain 3" },
                { dmg: 6, effect: "Dislocated, Lost Arm*" },
                { dmg: 7, effect: "Fractured, Trauma 2" },
                { dmg: 8, effect: "Shattered, Lost Arm‡" },
                { dmg: 9, effect: "Torn Off, Lost Arm|Bleed 5" },
                { dmg: 10, effect: "Deflect into Neck, Dead" }
            ]
        },
        2: { // Shoulder R
            location: "Shoulder", 
            side: "R", 
            effects: [
                { dmg: 1, effect: "Tenderized, Pain 1" },
                { dmg: 2, effect: "Beaten, Disarm" },
                { dmg: 3, effect: "Chipped, Pain 2" },
                { dmg: 4, effect: "Torn Rotator Cuff, Trauma 1" },
                { dmg: 5, effect: "Nerve Damage, Disarm|Pain 3" },
                { dmg: 6, effect: "Dislocated, Lost Arm*" },
                { dmg: 7, effect: "Fractured, Trauma 2" },
                { dmg: 8, effect: "Shattered, Lost Arm‡" },
                { dmg: 9, effect: "Torn Off, Lost Arm|Bleed 5" },
                { dmg: 10, effect: "Deflect into Neck, Dead" }
            ]
        },
        3: { // Pelvis
            location: "Pelvis",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Checked, Fall Prone" },
                { dmg: 3, effect: "Chipped, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Stun 1" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Smashed Groin, Stun 2" },
                { dmg: 7, effect: "Major Break, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Shattered, Lost Legs‡ Pain 5" },
                { dmg: 10, effect: "Cut Abdominal Aorta, Dead" }
            ]
        },
        4: { // Pelvis - Same as 3
            location: "Pelvis",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Checked, Fall Prone" },
                { dmg: 3, effect: "Chipped, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Stun 1" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Smashed Groin, Stun 2" },
                { dmg: 7, effect: "Major Break, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Shattered, Lost Legs‡ Pain 5" },
                { dmg: 10, effect: "Cut Abdominal Aorta, Dead" }
            ]
        },
        5: { // Rib Cage
            location: "Rib Cage",
            effects: [
                { dmg: 1, effect: "Throbbing Hit, Pain 1" },
                { dmg: 2, effect: "Organ Press, Fall Prone" },
                { dmg: 3, effect: "Fractured Rib, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Stun 1" },
                { dmg: 5, effect: "Few Broken Ribs, Trauma 2" },
                { dmg: 6, effect: "Vessel Rip, Bleed 2" },
                { dmg: 7, effect: "Many Broken Ribs, Trauma 3" },
                { dmg: 8, effect: "Bone Shrapnel, Bleed 4" },
                { dmg: 9, effect: "Severed Spine, Helpless 5‡" },
                { dmg: 10, effect: "Chopped in Half, Dead" }
            ]
        },
        6: { // Rib Cage - Same as 5
            location: "Rib Cage",
            effects: [
                { dmg: 1, effect: "Throbbing Hit, Pain 1" },
                { dmg: 2, effect: "Organ Press, Fall Prone" },
                { dmg: 3, effect: "Fractured Rib, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Stun 1" },
                { dmg: 5, effect: "Few Broken Ribs, Trauma 2" },
                { dmg: 6, effect: "Vessel Rip, Bleed 2" },
                { dmg: 7, effect: "Many Broken Ribs, Trauma 3" },
                { dmg: 8, effect: "Bone Shrapnel, Bleed 4" },
                { dmg: 9, effect: "Severed Spine, Helpless 5‡" },
                { dmg: 10, effect: "Chopped in Half, Dead" }
            ]
        },
        7: { // Guts
            location: "Guts",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Checked, Fall Prone" },
                { dmg: 3, effect: "Internal Bleed, Bleed 1" },
                { dmg: 4, effect: "Vomiting, Stun 1" },
                { dmg: 5, effect: "Punctured Gut, Bleed 2" },
                { dmg: 6, effect: "Ripped Abs, Pain 2*|Bleed 2" },
                { dmg: 7, effect: "Lining Damage, Pain 3" },
                { dmg: 8, effect: "Exposed Intestine, Bleed 4" },
                { dmg: 9, effect: "Fecal Seep, Poison 5" },
                { dmg: 10, effect: "Disemboweled, Dead" }
            ]
        },
        8: { // Guts - Same as 7
            location: "Guts",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Checked, Fall Prone" },
                { dmg: 3, effect: "Internal Bleed, Bleed 1" },
                { dmg: 4, effect: "Vomiting, Stun 1" },
                { dmg: 5, effect: "Punctured Gut, Bleed 2" },
                { dmg: 6, effect: "Ripped Abs, Pain 2*|Bleed 2" },
                { dmg: 7, effect: "Lining Damage, Pain 3" },
                { dmg: 8, effect: "Exposed Intestine, Bleed 4" },
                { dmg: 9, effect: "Fecal Seep, Poison 5" },
                { dmg: 10, effect: "Disemboweled, Dead" }
            ]
        },
        9: { // Liver/Kidney
            location: "Liver/Kidney",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Shocked, Fall Prone" },
                { dmg: 3, effect: "Nick, Bleed 1" },
                { dmg: 4, effect: "Spasmed, Stun 1" },
                { dmg: 5, effect: "Profuse Bleeding, Bleed 2" },
                { dmg: 6, effect: "Organ Leak, Poison 2" },
                { dmg: 7, effect: "Rupture, Bleed 3" },
                { dmg: 8, effect: "Toxic Shock, Poison 4" },
                { dmg: 9, effect: "Extraction, Bleed 5" },
                { dmg: 10, effect: "Lacerated Vena Cava, Dead" }
            ]
        },
        10: { // Heart/Lung
            location: "Heart/Lung",
            effects: [
                { dmg: 1, effect: "Knocked out Wind, Stun 1" },
                { dmg: 2, effect: "Heart Bounce, Fall Prone" },
                { dmg: 3, effect: "Interrupt Breathing, Stun 2" },
                { dmg: 4, effect: "Bruised Heart, Trauma 1" },
                { dmg: 5, effect: "Paralyzed Diaphragm, Stun 3" },
                { dmg: 6, effect: "Heart Damage, Trauma 2" },
                { dmg: 7, effect: "Bleeding Lung, Bleed 5" },
                { dmg: 8, effect: "Punctured Lung, Suffocate*" },
                { dmg: 9, effect: "Nicked Heart, Bleed 7" },
                { dmg: 10, effect: "Heart Ripped Out, Dead" }
            ]
        }
    },

    // Arm table (Example structure, needs filling from markdown)
    arm: {
        1: { // Hand L
            location: "Hand", 
            side: "L", 
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Bashed, Disarmed" },
                { dmg: 3, effect: "Twisted Wrist, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 1" },
                { dmg: 7, effect: "Broken Carpal, Trauma 3" },
                { dmg: 8, effect: "Cut, d4 Lost Fingers|Bleed 1" },
                { dmg: 9, effect: "Mangled, Lost Hand‡|Bleed 2" },
                { dmg: 10, effect: "Severed, Lost Hand|Bleed 3" }
            ]
        },
        2: { // Hand R
            location: "Hand", 
            side: "R", 
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Bashed, Disarmed" },
                { dmg: 3, effect: "Twisted Wrist, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 1" },
                { dmg: 7, effect: "Broken Carpal, Trauma 3" },
                { dmg: 8, effect: "Cut, d4 Lost Fingers|Bleed 1" },
                { dmg: 9, effect: "Mangled, Lost Hand‡|Bleed 2" },
                { dmg: 10, effect: "Severed, Lost Hand|Bleed 3" }
            ]
        },
        3: { // Hand (No Side)
            location: "Hand",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Bashed, Disarmed" },
                { dmg: 3, effect: "Twisted Wrist, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 1" },
                { dmg: 7, effect: "Broken Carpal, Trauma 3" },
                { dmg: 8, effect: "Cut, d4 Lost Fingers|Bleed 1" },
                { dmg: 9, effect: "Mangled, Lost Hand‡|Bleed 2" },
                { dmg: 10, effect: "Severed, Lost Hand|Bleed 3" }
            ]
        },
        4: { // Forearm L
            location: "Forearm",
            side: "L",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Disarmed" },
                { dmg: 3, effect: "Extended Elbow, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Ulna, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Rent, Lost Forearm‡|Bleed 3" },
                { dmg: 10, effect: "Split, Lost Forearm|Bleed 4" }
            ]
        },
        5: { // Forearm R
            location: "Forearm",
            side: "R",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Disarmed" },
                { dmg: 3, effect: "Extended Elbow, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Ulna, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Rent, Lost Forearm‡|Bleed 3" },
                { dmg: 10, effect: "Split, Lost Forearm|Bleed 4" }
            ]
        },
        6: { // Forearm (No Side)
            location: "Forearm",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Disarmed" },
                { dmg: 3, effect: "Extended Elbow, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Ulna, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Rent, Lost Forearm‡|Bleed 3" },
                { dmg: 10, effect: "Split, Lost Forearm|Bleed 4" }
            ]
        },
        7: { // Forearm (No Side)
            location: "Forearm",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Disarmed" },
                { dmg: 3, effect: "Extended Elbow, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Ulna, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Rent, Lost Forearm‡|Bleed 3" },
                { dmg: 10, effect: "Split, Lost Forearm|Bleed 4" }
            ]
        },
        8: { // Upper Arm L
            location: "Upper Arm",
            side: "L",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Beaten, Disarmed" },
                { dmg: 3, effect: "Tendon Sprain, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Humerus, Trauma 3" },
                { dmg: 8, effect: "Ripped Artery, Bleed 4" },
                { dmg: 9, effect: "Maimed, Lost Arm‡|Bleed 4" },
                { dmg: 10, effect: "Severed, Lost Arm|Bleed 5" }
            ]
        },
        9: { // Upper Arm R
            location: "Upper Arm",
            side: "R",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Beaten, Disarmed" },
                { dmg: 3, effect: "Tendon Sprain, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Humerus, Trauma 3" },
                { dmg: 8, effect: "Ripped Artery, Bleed 4" },
                { dmg: 9, effect: "Maimed, Lost Arm‡|Bleed 4" },
                { dmg: 10, effect: "Severed, Lost Arm|Bleed 5" }
            ]
        },
        10: { // Upper Arm (No Side)
            location: "Upper Arm",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Beaten, Disarmed" },
                { dmg: 3, effect: "Tendon Sprain, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" },
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" },
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" },
                { dmg: 7, effect: "Broken Humerus, Trauma 3" },
                { dmg: 8, effect: "Ripped Artery, Bleed 4" },
                { dmg: 9, effect: "Maimed, Lost Arm‡|Bleed 4" },
                { dmg: 10, effect: "Severed, Lost Arm|Bleed 5" }
            ]
        }
    },
    // Leg table (Example structure, needs filling from markdown)
    leg: {
        1: { // Foot L
            location: "Foot", 
            side: "L", 
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Bashed, Fall Prone" },
                { dmg: 3, effect: "Twisted Ankle, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 1" }, // Assumed from Arm Hand
                { dmg: 7, effect: "Broken Tarsal, Trauma 3" },
                { dmg: 8, effect: "Hacked, d4 Lost Toes|Bleed 1" },
                { dmg: 9, effect: "Mangled, Lost Foot‡|Bleed 2" },
                { dmg: 10, effect: "Severed, Lost Foot|Bleed 3" }
            ]
        },
        2: { // Foot R
            location: "Foot", 
            side: "R", 
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Bashed, Fall Prone" },
                { dmg: 3, effect: "Twisted Ankle, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 1" }, // Assumed from Arm Hand
                { dmg: 7, effect: "Broken Tarsal, Trauma 3" },
                { dmg: 8, effect: "Hacked, d4 Lost Toes|Bleed 1" },
                { dmg: 9, effect: "Mangled, Lost Foot‡|Bleed 2" },
                { dmg: 10, effect: "Severed, Lost Foot|Bleed 3" }
            ]
        },
        3: { // Foot (No Side)
            location: "Foot",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Bashed, Fall Prone" },
                { dmg: 3, effect: "Twisted Ankle, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 1" }, // Assumed from Arm Hand
                { dmg: 7, effect: "Broken Tarsal, Trauma 3" },
                { dmg: 8, effect: "Hacked, d4 Lost Toes|Bleed 1" },
                { dmg: 9, effect: "Mangled, Lost Foot‡|Bleed 2" },
                { dmg: 10, effect: "Severed, Lost Foot|Bleed 3" }
            ]
        },
        4: { // Shin L
            location: "Shin",
            side: "L",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Fall Prone" },
                { dmg: 3, effect: "Extended Knee, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Forearm
                { dmg: 7, effect: "Broken Tibia, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Mutilated, Lost Shin‡|Bleed 3" },
                { dmg: 10, effect: "Severed, Lost Shin|Bleed 4" }
            ]
        },
        5: { // Shin R
            location: "Shin",
            side: "R",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Fall Prone" },
                { dmg: 3, effect: "Extended Knee, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Forearm
                { dmg: 7, effect: "Broken Tibia, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Mutilated, Lost Shin‡|Bleed 3" },
                { dmg: 10, effect: "Severed, Lost Shin|Bleed 4" }
            ]
        },
        6: { // Shin (No Side)
            location: "Shin",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Fall Prone" },
                { dmg: 3, effect: "Extended Knee, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Forearm
                { dmg: 7, effect: "Broken Tibia, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Mutilated, Lost Shin‡|Bleed 3" },
                { dmg: 10, effect: "Severed, Lost Shin|Bleed 4" }
            ]
        },
        7: { // Shin (No Side)
            location: "Shin",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Battered, Fall Prone" },
                { dmg: 3, effect: "Extended Knee, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Forearm
                { dmg: 7, effect: "Broken Tibia, Trauma 3" },
                { dmg: 8, effect: "Torn Artery, Bleed 3" },
                { dmg: 9, effect: "Mutilated, Lost Shin‡|Bleed 3" },
                { dmg: 10, effect: "Severed, Lost Shin|Bleed 4" }
            ]
        },
        8: { // Thigh L
            location: "Thigh",
            side: "L",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Beaten, Fall Prone" },
                { dmg: 3, effect: "Tendon Sprain, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Upper Arm
                { dmg: 7, effect: "Broken Femur, Trauma 3" },
                { dmg: 8, effect: "Ripped Artery, Bleed 4" },
                { dmg: 9, effect: "Maimed, Lost Leg‡|Bleed 4" },
                { dmg: 10, effect: "Severed, Lost Leg|Bleed 5" }
            ]
        },
        9: { // Thigh R
            location: "Thigh",
            side: "R",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Beaten, Fall Prone" },
                { dmg: 3, effect: "Tendon Sprain, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Upper Arm
                { dmg: 7, effect: "Broken Femur, Trauma 3" },
                { dmg: 8, effect: "Ripped Artery, Bleed 4" },
                { dmg: 9, effect: "Maimed, Lost Leg‡|Bleed 4" },
                { dmg: 10, effect: "Severed, Lost Leg|Bleed 5" }
            ]
        },
        10: { // Thigh (No Side)
            location: "Thigh",
            effects: [
                { dmg: 1, effect: "Bruised, Pain 1" },
                { dmg: 2, effect: "Beaten, Fall Prone" },
                { dmg: 3, effect: "Tendon Sprain, Trauma 1" },
                { dmg: 4, effect: "Nerve Struck, Pain 2" }, // Assumed from Arm
                { dmg: 5, effect: "Hairline Fracture, Trauma 2" }, // Assumed from Arm
                { dmg: 6, effect: "Transfixed, Pain 1|Bleed 2" }, // Assumed from Arm Upper Arm
                { dmg: 7, effect: "Broken Femur, Trauma 3" },
                { dmg: 8, effect: "Ripped Artery, Bleed 4" },
                { dmg: 9, effect: "Maimed, Lost Leg‡|Bleed 4" },
                { dmg: 10, effect: "Severed, Lost Leg|Bleed 5" }
            ]
        }
    }
};

/**
 * Get a specific injury table by name
 * @param {string} tableName - The name of the table (head, eye, jaw, etc.)
 * @returns {Object|null} - The injury table or null if not found
 */
export function getInjuryTable(tableName) {
    return InjuryTables[tableName] || null;
}

/**
 * Roll on a specific injury table
 * @param {string} tableName - The name of the table (head, eye, jaw, etc.)
 * @param {number|null} roll - Optional d10 roll, if null a random roll will be made
 * @returns {Object} - The injury result with location, side, and effects
 */
export function rollOnInjuryTable(tableName, roll = null) {
    const table = getInjuryTable(tableName);
    if (!table) return null;
    
    // If no roll provided, make a random d10 roll
    if (roll === null) {
        roll = Math.floor(Math.random() * 10) + 1;
    }
    
    // Ensure roll is within valid range
    roll = Math.max(1, Math.min(10, roll));
    
    return {
        roll: roll,
        ...table[roll]
    };
}

/**
 * Get the full injury name including side if applicable
 * @param {Object} injury - The injury object from rollOnInjuryTable
 * @returns {string} - The formatted injury name with side if applicable
 */
export function getFullInjuryName(injury) {
    if (!injury) return "Unknown";
    
    let name = injury.location;
    
    // Add side indicator if present
    if (injury.side) {
        name += ` (${injury.side})`;
    }
    
    return name;
}

/**
 * Get the injury effect based on the injury object and damage value
 * @param {object} injury The injury object from the table (containing specific location and effects array)
 * @param {number} damage The final damage value
 * @returns {string} The injury effect description
 */
export function getInjuryEffect(injury, damage) {
    // Handle cases where injury object might be invalid or missing effects
    if (!injury || !injury.effects || !Array.isArray(injury.effects) || injury.effects.length === 0) {
        console.warn(`Invalid injury object or missing effects:`, injury);
        return "Unknown Effect"; // Return a default or error string
    }

    // Handle zero or negative damage
    if (damage <= 0) {
        return "Deflected!"; // Or perhaps "Deflected" or similar based on your game rules
    }

    // Ensure effects are sorted by damage descending (just in case)
    const sortedEffects = injury.effects.sort((a, b) => b.dmg - a.dmg);

    // Iterate through effects from highest damage threshold downwards
    for (const effectEntry of sortedEffects) {
        if (damage >= effectEntry.dmg) {
            return effectEntry.effect; // Return the first matching effect
        }
    }

    // If damage is positive but below the lowest threshold (e.g., damage 0.5?), return a default minor effect or the lowest one?
    // For now, let's return the lowest effect if no threshold is met (shouldn't happen if dmg:1 exists)
    console.warn(`Damage ${damage} was below the lowest threshold for injury:`, injury);
    return sortedEffects[sortedEffects.length - 1]?.effect || "Minimal Effect"; 
} 