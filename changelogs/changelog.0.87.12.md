
### SRD
- Implemented Improved Critical, Epic Weapon Focus, Multiweapon Fighting, Multiattack
- Implemented automatic ability modifier change for creatures with one natural attack
- Reimported monsters from SRD

### Features
- Saving Throws system rework
  - Saving Throw Combat Modifiers (working like attacks and AC combat modifiers)
  - Saving Throw common types (Will/Reflex/Fortitude Negates or Half) with possibility of assigning different Ability modifier to roll
- Added `featSpellDCBonus` combat change that raises spell DC
- Attacks created from unidentified weapons now create attacks with base weapon stats

### Bug Fixes
- Magic Items abilities not resetting on rest
- Item Type and Action Type in Combat Changes have more meaningful names now.
- Bag of Holding (and similar items) now correctly do not count content weights to Character carrying weight 
- [#177](https://github.com/Rughalt/D35E/issues/177) - Skill points now correctly calculate for cross and non-class skills
- [#179](https://github.com/Rughalt/D35E/issues/179) - Skill points now correctly reset after reducing them to 0 in level up data.
- [#176](https://github.com/Rughalt/D35E/issues/176) - Ability damage correctly changes carry weight
- [#185](https://github.com/Rughalt/D35E/issues/185) - Disabled abilities disappear from Class Progression table
- [#194](https://github.com/Rughalt/D35E/issues/194) - Input for sub-skill name now takes all available space
- [#169](https://github.com/Rughalt/D35E/issues/194) - Wrong special action order in spell fixed
- [#62](https://github.com/Rughalt/D35E/issues/62) - Swarms have correct token size