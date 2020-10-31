# Changelog
*Newer changes are places in changelogs directory*
## 0.86.6
### Bug Fixes
- [#89](https://github.com/Rughalt/D35E/issues/89) - Natural armor field missed in the NPC charlist
- [#91](https://github.com/Rughalt/D35E/issues/91) - Grapple Modifier doesn't add up
- [#92](https://github.com/Rughalt/D35E/issues/92) - Attack bonus/penalty for size is reverted for attack bonuses fields
- [#93](https://github.com/Rughalt/D35E/issues/93) - Some monsters dragged from compendium can't be modified

### Bug Fixes

## 0.86.5

### Bug Fixes
- [#86](https://github.com/Rughalt/D35E/issues/86) - Rolling grapple displays null in roll data 
- [#85](https://github.com/Rughalt/D35E/issues/85) - Add size modifiers to rolls for base Melee and Ranged attack
- [#84](https://github.com/Rughalt/D35E/issues/84) - Cannot set Ability scores from Attribute tab 
- [#83](https://github.com/Rughalt/D35E/issues/83) - Add ability to toggle Class Features list under classes
- [#82](https://github.com/Rughalt/D35E/issues/82) - Using ECL for XP count if Level Progression is disabled
- [#80](https://github.com/Rughalt/D35E/issues/80) - Subskills do not work in Level Up Details
- [#78](https://github.com/Rughalt/D35E/issues/78) - Gracefully fail if cannot migrate a pack
- [#79](https://github.com/Rughalt/D35E/issues/79) - No scrollbars in default skin


## 0.86.4
### SRD
- Added Prestige Classes: Archmage, Assassin, Blackguard, Dwarven Defender, Eldricht Knight
### Features
- Added compatibility with 0.7.X series
- Full Level Progression system rework:
    - Ability to set which Class Level was gained at which Character Level
    - Ability to set Hit Points per Level
    - Ability to set Skill Points per level
    - Compatibility with NPCs and old Characters (that will use simple progression system)
- Theme redesign, theme now enabled by default for new clients
- New change type: BAB
- Support for new 0.7.X series lighting effects
    - New lighting options for items
    - Added lighting to existing magic items and standard light sources
- Ported Vision Permission dialog from PF1
- Added ability to add custom class features when using special World Compendium

### Bug Fixes
- Fixes loading characters that had no Prestige Caster Level
- [#61](https://github.com/Rughalt/D35E/issues/61) - Fixed Ranger class Favorite Enemy 
- [#57](https://github.com/Rughalt/D35E/issues/57) - Add possibility to give bab in the changes tab 
- [#63](https://github.com/Rughalt/D35E/issues/55) - Monsters didn't get feats every 3 levels 
- [#60](https://github.com/Rughalt/D35E/issues/55) - Spellslots tables are wrong 
- [#64](https://github.com/Rughalt/D35E/issues/55) - Class details break when selecting *None* as saving throw progression.
- [#58](https://github.com/Rughalt/D35E/issues/55) - Damage value doesn't overriding 
- [#59](https://github.com/Rughalt/D35E/issues/55) - Power attack not working properly 
- [#75](https://github.com/Rughalt/D35E/issues/55) - Fighter didn't get bonus feat at lvl 1 
- [#77](https://github.com/Rughalt/D35E/issues/55) - Fixed Ranger class Favorite Enemy 
  

## 0.85.4
### Features
- [#55](https://github.com/Rughalt/D35E/issues/55) - Updated French translation by @red5h4d0w
- Updated Class Abilities/Features rendering style
### Bug Fixes
- Fixed regression caused by displaying damage type for typeless damage

## 0.85.3
### SRD
- Finished Base classes implementation
- Added Base classes descriptions and art

### Features
- Onboarding/Tutorial for new players
- Automatic Class Features adding and removing
- Automatic Spell slot calculation
- Ability to set up spellbook from Class
- Point-Buy system based on Pathfinder 1 rules - ported from PF1


## 0.84.2
### SRD
- Added various missing Enhancements from SRD

### Features
- Added ability to use Magic Item Abilities directly from Char Sheet
- Added ability to create Enhancements from Spells and Buffs

## 0.84.1
### SRD
- Additional Spells have full implementation, thanks to BixSexy#9434
- Base Weapon and Armor Enhancements
- Specific Magic Weapons and Armor updates
    - Specific Shields - added abilities and enhancements
    - Specific Weapons - added abilities and enhancements

### Features
- Enhancement support
- Base feats for attack rolls
    - Power Attack (this also fixed [#39](https://github.com/Rughalt/D35E/issues/39))
    - Manyshot and Greater Manyshot
    - Rapid Shot
- Two-Weapon Fighting support for attack rolls
    - Automatic penalty application
    - Automatic additional attacks for Greater and Improved Two-Weapon Fighting Feats
- Ability to set damage type on Ammunition

### Bug Fixes
- Fixed Ammunition Bonus Damage being incorrectly added to damage roll.
- [#52](https://github.com/Rughalt/D35E/issues/52) Randomize HP rolls up to HD sides instead of levels

## 0.83.5
### SRD
- Fixed imported spells/powers with added fixes by BixSexy#9434
- Fixed some monster import rules and added monster images/tokens

### Features
- Reduced module size by reducing icons size to 128x128
- Moved Create Attack button on Weapon details screen to front
- Spells automatically set correct level when dropping on spellbook with class set up

### Bug Fixes 
- Multiple rolls with Dice So Nice! do not longer occur.

## 0.83.2
### SRD
- Fixed Monster compendium to be SRD compliant

### Bug Fixes 
- Removed DND copyrighted names from description and packge title and readme
- Fixed spell icon
- [#39](https://github.com/Rughalt/D35E/issues/39) - Turn Undead Uses is still not calculating correctly.
- [#40](https://github.com/Rughalt/D35E/issues/40) - Dragging an Item from the sidebar into a character sheet doesn't retain Action data.

## 0.83
### SRD
- Monster compendium
- Fixes for Racial HD compendium
- Conditions compendium

### Features
- Shapechange feature - access it on Buff - Shapechange tab. Create shapechange buffs by dragging NPC Actors into character sheet.
    - Wildshape - melds used items and attacks, copies natural attack of monster and sets abilities
    - Polymorph - melds natural attacks, copies natural attack of monster and sets abilities
    - Alter self - changes appearance
- [#15](https://github.com/Rughalt/D35E/issues/15) - Rolling NPC Hit Die

### Bug Fixes   
- Golem bonus HP now depends on size
- Undead HP and Fortitude are no longer calculated using their Charisma modifier anymore
- Sped up container updates
- [#33](https://github.com/Rughalt/D35E/issues/34) - Conditions Compendium using Pathfinder conditions not 3.5
- [#34](https://github.com/Rughalt/D35E/issues/34) - Racial HD compendium bugs
- [#32](https://github.com/Rughalt/D35E/issues/32) - Bonus PowerPoints doesn't acount for item/custom racial Ability Score modifiers
- [#35](https://github.com/Rughalt/D35E/issues/35) - Rogue class calculates sneak attack damage based on char level instead of rogue level
- [#36](https://github.com/Rughalt/D35E/issues/36) - Turn Undead Uses doesn't calculate correctly
- [#38](https://github.com/Rughalt/D35E/issues/38) - Revealing details for unidentified items

## 0.82.1
### Bug Fixes
- Disabled Foundry VTT debug mode


## 0.82
### SRD
- Fixes for Base Classes implementation (Paladin, Barbarian, NPC classes)
- Added Soulknife special abilities
- Converted Backpacks etc. to Containers
- Added Magic Items from SRD - currently description and typing, no special properties

### Features
- Container item type and ability to assign items to containers (with support for Bags of Holding)
- Toggleable custom skin for Foundry VTT
- Application of Attack damage/Special buffs for targeted tokens
- Ported spell- and power-based consumable creation from PF1

### Bug Fixes
- [#19](https://github.com/Rughalt/D35E/issues/19) - Armor doesn't have option for Masterwork bug
- [#21](https://github.com/Rughalt/D35E/issues/21) - sizeRoll() given static value instead variable when creating an attack
- [#13](https://github.com/Rughalt/D35E/issues/13) - Missing input for Ammo Bonus Damage formula
- [#23](https://github.com/Rughalt/D35E/issues/23) - Applying a race from the compendium places a large color box on the NPC sheet in place of name or avatar
- [#20](https://github.com/Rughalt/D35E/issues/20) - Attacks created from weapons are created as Ranged Weapon Attacks.
- [#22](https://github.com/Rughalt/D35E/issues/22) - sizeRoll() increases the d4 and d6 by 2 steps instead of 1
- [#16](https://github.com/Rughalt/D35E/issues/16) - Missing Grapple box on Player character sheet 
- [#17](https://github.com/Rughalt/D35E/issues/17) - Changes tab still references CMB/CMD no way to add to Grapple
- [#14](https://github.com/Rughalt/D35E/issues/14) - Grapple size modifier uses PF vales not 3.5
- [#8](https://github.com/Rughalt/D35E/issues/8) - Class Compendium bugs
- [#25](https://github.com/Rughalt/D35E/issues/25) - Damage bonus applied twice if more than one type of damage is present
- [#24](https://github.com/Rughalt/D35E/issues/24) - Skill roll-up on character sheet doesn't show specialized skills

## 0.81

### SRD
- Finished Base Classes (without Wilder and Soulknife special abilities)
- Finished Races (without new icons tough)
- Finished Racial HD

### Features
- Level adjustment for races
- Buff time tracking
- Use multiple items/features/classes charges at once
- Ability to use ammunition with ranged weapon attacks
- Ability to assign bonus damage to ammunition
- Added party HUD
- Added welcome screen

### Bug Fixes
- Fixed skill calculation for multiclass characters
- Fixed character sheet text length
- Fixes permission when GM rolls effect for player
- [#2](https://github.com/Rughalt/D35E/issues/2) - Limited character sheet scrollbar
- [#3](https://github.com/Rughalt/D35E/issues/3) - Saving throws rolled multiple times

## 0.56 - 0.80
A lot of things were fixed.

## 0.55
Updated to 0.6.0 std's

### Bug Fixes


### Changelog
- Applied the latest fixes

## 0.54
Implemented latest fixes of template messurement

### Bug Fixes


### Changelog
- Applied the latest fixes that fury made :)
- added some skill math changes. 

## 0.52

### Bug Fixes


### Changelog
- Retrofited the entire system to run as a 3.5e system
changing skills, skill rank calculation and skills pr level
also started adding compendium items for ease of use,
so far armor, weapons, items and classes from the playershandbook
have been added.


## 0.51

### Bug Fixes

- Measure templates for attacks didn't work since Foundry 0.5.6 anymore
- CMB incorrectly used Strength instead of Dexterity for actors that were Tiny or smaller

### Changelog

- Spellbooks are now set to spontaneous or not, rather than individual spells
- Added a rest option to actors which will automatically heal hit point and ability score damage, as well as restore daily uses of items, features, attacks, spells and spellbooks
- Measure template previews now highlight the grid they affect

## 0.5

### Bug Fixes

- Saving throw and skill roll criticals and fumbles weren't being highlighted anymore
- Dice So Nice integration for multi attacks was showing the result of the last roll on every dice toss
- Attacks without damage or effect notes weren't useable

### Changelog

- Attacks with multiple damage parts now have their parts clearly separated in the chat tooltip
- Full attacks are now consolidated into a single chat card again
- Added a few more bestiary entries
- Edited the Award XP sample macro to add an option for distributing experience evenly among those selected

## 0.44

### Bug Fixes

- Quick attack actions not using token data when applicable
- Pre-processed functions (sizeRoll) couldn't use calculated parameters
- Attack and effect/damage notes were not using any actor data

### Changelog

- Dice So Nice integration
- Obfuscate roll notes from players without at least LIMITED permission over the actor
- Added mechanism to automatically deduct spell uses
- Added sample macro to award experience points

## 0.431

### Changelog

- Now pre-processes the `sizeRoll` function, which gives the ability to show the die you rolled as a result

## 0.43

### Bug Fixes

- Fix missing icons for classes

### Changelog

- Added a few more tooltips for formula uses
- Added a new variable for formulas: `@size`, which is a number in the range of -4 to 4, based on the actor's size, where 0 equals Medium
- Added a new function to use in formulas: `sizeRoll(c, s[, size[, crit]])`, which returns a random number based on a given die for different sizes (for more information, check [https://furyspark.gitlab.io/foundryvtt-pathfinder1-doc/advanced/formula-data/](https://furyspark.gitlab.io/foundryvtt-pathfinder1-doc/advanced/formula-data/))
- Added some data fields for weapons to account for the new size functionality, and creating an attack from a weapon now uses the new function
- Added feat tags and a feat compendium browser
- Added context note options for all attack and damage rolls to items with changes

## 0.42

### Bug Fixes

- Inability to rename items in certain conditions

### Changelog

- Improved styling of attack and effect notes
- Added a quick way of adding and subtracting item quantities in inventory screens
- Og added more weapons, ammo, armor and shields (this did change around some icon files, so unfortunately it'll mean you have to manually change icons or replace items) (many thanks!)
- Turned certain dice rolls (such as skills and saving throws, but not attacks) into actual Roll type messages again, meaning they will work with modules that rely on that data (such as BubbleRolls)
- Dorgendubal added quick attacks to tokens (many thanks!)

## 0.411

### Bug Fixes

- Shields were not applying their AC

### Changelog

- Dorgendubal added initial support for the metric system (many thanks!)
- Moved defense tab on character and npc sheets

## 0.41

### Bug Fixes

- Actor inventories didn't show an equipment's label under certain circumstances
- An error in physical item updates
- A niche error with item attacks
- Actors weren't being slowed down by armor anymore

### Changelog

- @Grenadier added an advanced health configuration screen (many thanks!)
- A lot of feats were updated (thanks, @Og and @Krise !)
- Added 3 creatures to the bestiary

## 0.4

### Changelog

- @Xam changed up some hardcoded strings (many thanks!)
- Add an actor inventory column for GMs to set an item's identified state
- Refactored weapons' and equipments' categories, adding subcategories to them as well
  - The items compendium has been updated to reflect these changes
  - The migration will do a decent job at updating the (sub)types of these items, but sometimes it's not possible to get appropriate data from previous entries (most notably with shield subtypes)
- Added a sample macro for toggling buffs
- Add an option to automatically deduct charges from items
- Changed styling of character sheet tabs somewhat
- Add an option to adjust the base DC formula of spells, on a per-spellbook basis
- Spells dropped on an actor's sheet now start out belonging to the currently open spellbook
- Hovering over certain attributes on character sheets now shows a tooltip, where previously the intent was completely hidden (such as with alignment, deity, temp hp, etc.)

## 0.361

### Bug Fixes

- Automated HP calculation was not being done properly past level 2
- Identified weapon names were being forgotten

## 0.36

### Bug Fixes

- Blind rolls were not hidden

### Changelog

- Slightly improve styling of actor sheets with limited visibility
- Add initial support for unidentified items
  - Only GMs can toggle an item's identified state
  - Players will see an alternate name, description and price, and some info is completely missing for unidentified items
  - Actions of unidentified items are unusable by players
- Add separate carried column for actors' inventories, and a quick way to mark an item as carried/not carried.
- Add an alternate style for item names without a quantity in actors' inventories (a line through the name)
- @Grenadier added the Wounds and Vigor optional rules system (many thanks!)
- @Grenadier changed automatic hit point calculation to be slightly higher (acknowledge the fact that there's no 0 on a dice) (many thanks!)

## 0.35

### Bug Fixes

- Using spells with multiple attacks showed the spell description multiple times
- John Shetler fixed a giant oversight in the Fractional Base Bonuses optional rule system (many thanks!)

### Changelog

- Add color and texture override options to measure templates on items
- Added a dedicated field for darkvision in token configurations
  - Unlike bright vision, darkvision radius ignores the scene's darkness level, making it seem fully lit for darkvision owners (up to their darkvision radius)
  - Updated creatures in the bestiary to use darkvision instead of bright vision
- @Dorgendubal and @rectulo improved the French translation (many thanks!)

## 0.34

### Bug Fixes

- Armor Check Penalty stacked incorrectly
- Fog of War was not being loaded
- Items from hidden compendiums were visible to players in the compendium browsers
- Dexterity penalties didn't apply to flat-footed CMD
- Having multiple spell level checkboxes ticked in the compendium browser used to be an AND comparison, when it should have been an OR comparison

### Changelog

- Imported most (if not all) spells into a compendium
  - The old spells compendium is replaced
  - The spells all have a generic icon, and a lot of them don't have a damage formula or template yet when they could make use of one

## 0.33

### Changelog

- Add level requirement data fields for spells
  - Updated the spells compendium to reflect these changes
- Add compendium browsers
  - Currently only for spells, items and a bestiary, but more to come
- Creatures with a climb or swim speed now gain a +8 Racial bonus to the Climb and Swim skills, respectively, as per the core rules
- Merged the Armor, Weapons and Magic Items compendium into a single compendium
- Added a bunch of entries to the following compendiums: bestiary, spells and items

## 0.32

### Bug Fixes

- Sample macros' accidental reliance on Furnace

### Changelog

- Add Fractional Base Bonuses optional ruleset as a world setting
- Add another type of class, Racial HD, which represents a creature's racial hit die
  - Added a compendium for racial hit die
  - What little exists in the bestiary compendium has been updated to reflect this
- Classes can now have changes, similar to buffs, feats, weapons and equipment
- Added a list of all skills to classes with checkboxes to make them class skills
  - A skill is now a class skill if it's checked as a class skill on at least one of the actor's classes
  - Updated all classes in the classes compendium to reflect these changes
- Add option for items with actions (like spells and attacks) to have an associated measure template
  - When using the attack or spell, you get an option on whether you want to automatically insert the template
- Add option to ignore arcane spell failure, on a per-spellbook basis

## 0.311

### Bug Fixes

- Character sheet glitch with incorrect class type set

## 0.31

### Bug Fixes

- Freeze on adding/removing items to/from unlinked tokens

### Changelog

- Improved existing sample macros
- Added a journal compendium for conditions
- Shows a warning on character sheets without a class, indicating that some attributes require one
- Add option for natural attacks on whether it's a primary or secondary attack, and apply penalties as appropriate

## 0.302

### Bug Fixes

- Error with actor sheets in certain circumstances, causing them to not update

## 0.301

### Changelog

- Increased the compatible core version so that it works with FoundryVTT 0.5.5

## 0.3

### Bug Fixes

- Rectangle and ray measurements using too strict snapping

### Changelog

- Allow rolling initiative without combat
- Add another type of NPC sheet, which only shows inventory (useful for party loot tracking, for example)
- Automate scaling of BAB and Saving Throws with class levels (NOTE: you'll have to re-enter that info on your existing classes, one time only)
- Add a german translation (thanks, arwec!)
- Add a french translation (thanks, rectulo!)

## 0.26

### Bug Fixes

- Only base strength was used for calculating carrying capacity.
- Item changes with wrong formulas crashing/locking the actor's updates
- Delay with encumbrance penalties rolling in
- Low-light Vision always on under certain circumstances for players with multiple owned tokens

### Changelog

- Add power attack option to attack rolls, and show their dialog by default (shift-click or right-click to circumvent dialog)
- Add world setting to change low-light vision behaviour for players

## 0.25

### Bug Fixes

- Error with looking up fly maneuverability

### Changelog

- Turned most of the hardcoded UI text into translatable strings
- Generate spell descriptions automatically (will require some re-editing of spells)
- Updated spells compendium to reflect spell changes

## 0.24

### Bug Fixes

- Actor permissions not updating without a page refresh

### Changelog

- Add more movement types, and automate movement speedt totals based on encumbrance and armor
- Automation of spell slot count (you'll have to re-enter your casters' spell slot count for this update)
- Add lite version of the NPC sheet, which is meant to be used alongside an NPC stat block, and only shows the bare minimum
- Added a bunch of feats to their compendium, thanks to Amakiir (some icons still missing, for now)

## 0.23.2 (Shameful Emergency Update 2)

### Bug Fixes

- Certain actor data not updating

## 0.23.1 (Emergency Update)

### Bug Fixes

- Certain elements (textareas) on item sheets not updating
- Saving throw butons on efense chat cards for unlinked tokens not working
- Certain actor data not updating

## 0.23

### Bug Fixes

- Carrying capacity for creatures small than medium with low strength
- Glitch with token with deleted actor
- Duplicate effect notes on multi attacks
- Missing attack notes on attacks
- Glitch with buff/change flags
- Unlinked tokens not updating with item changes
- Features as item resources sometimes not working
- Level Drain not subtracting hit points

### Changelog

- Add world options to automatically calculate class hit points
- Add or update items in the following compendiums:
  - Classes (added NPC classes)
  - Weapons (fixed description for Shortbows)
  - Spells (unticked SR flag and removed saving throw)
- Add the following compendiums:
  - Bestiary
  - Sample Macros
  - Roll Tables
- Show more info on defense chat logs, including buttons to roll saving throws
- A slight performance increase in actor and owned item sheets
- Remove sound effect from showing defenses

## 0.22

### Bug Fixes

- Defenses not showing with auto collapsing chat cards enabled
- Certain properties not working on inline rolls in chat logs (like @item.level on a buff)
- Item macros with duplicate names (you need to re-add item macros for this to work correctly)
- Restrict access on certain actor functions (so players can't roll an NPC's skill checks in a macro, for example)

### Changelog

- Add or update some items to the following compendiums:
  - Magic Items
  - Common Buffs
- Add macro'able function to show an actor's defenses as a chatlog (game.D35E.rollDefenses()) (see [documentation](https://furyspark.gitlab.io/foundryvtt-pathfinder1-doc/advanced/macros/))

## 0.21

### Bug Fixes

- Inability to delete custom skills and subskills
- Bug with quadruped actors
- Scrolling issue on skill pages
- Unformatted inline rolls in item chat logs

### Changelog

- Add a button to show static defenses

## 0.2002

### Changelog

- Add weapon range
- Automatically fill out more slots when creating an attack: attack ability,
damage ability, damage ability multiplier, action type and action range
- Speed up actor sheets slightly
- Add ability to change loot item subtypes
- Fix measurement tools (cone and circle) to be more Pathfinder rule-friendly
- Support inline rolls for item roll messages
- Add compendiums for armor, weapons and magic items
