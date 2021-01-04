### SRD
- Added most basic Templates (except Lycanthrope)
- Added basic support for Domains and Spell Schools (spell list, description)
- Added short spell descriptions to all Spells and Powers
- Added spell list for Psychic Warrior

### Features
- Damage Types implementation with Resistances and Damage Reduction
    - You can now set complex Damage Reduction schemes and Energy Resistances
    - Weapons can be set to use correct Damage types on Attacks (with simple mapping provided for existing attacks).
    - Ability to create custom Energy types for damage
    - Automatic DR/ER resolving when using Apply Damage functionality
    - Basic Material support for Weapons (you can find basic materials in Materials Compendium)
    - **Warning!** Old Damage Reduction and Energy Resistances will not be migrated automatically to new version! You have to do it manually.
- Spell School and Domain Support
    - Added support for Spell School and Domain slot for classes that support it
    - Spells from Spell School or Domain have their own spell slot that does not use slots for normal spells.
    - **Warning!** Classes that were added to characters before this udate will net to have the option "Has special spell slot (Domain/School)" enabled manually
- Template support
    - Added special class type "Template", that has its level automatically set to actor HD
    - Most of the templates are drag-and-drop, with only very complex ones needing manual character alteration

### Quality of Life Improvements
- Spells now display short description in the spell list (this can be turned off in options)
- More links to the compendium on character sheet to ease access to pre-generated data
- Skill screen has been reworked to better show which skills have ranks, which require training and more

### Bug Fixes
- Fixed enhancements to be in line with new Damage Types system
- Changed how Undead 0 Constitution is handled by the system.
