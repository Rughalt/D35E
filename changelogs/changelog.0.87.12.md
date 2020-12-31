
### SRD
- Implemented Improved Critical, Epic Weapon Focus, Multiweapon Fighting, Multiattack
- Implemented automatic ability modifier change for creatures with one natural attack
- Reimported monsters from SRD

### Features
- Saving Throw Combat Modifiers (working like attacks and AC combat modifiers)
- Added `featSpellDCBonus` combat change that raises spell DC

### Bug Fixes
- Magic Items abilities not resetting on rest
- Item Type and Action Type in Combat Changes have more meaningful names now.
- [#177](https://github.com/Rughalt/D35E/issues/177) - Skill points now correctly calculate for cross and non-class skills
- [#179](https://github.com/Rughalt/D35E/issues/179) - Skill points now correctly reset after reducing them to 0 in level up data.
- [#176](https://github.com/Rughalt/D35E/issues/176) - Ability damage correctly changes carry weight
- [#185](https://github.com/Rughalt/D35E/issues/185) - Disabled abilities disappear from Class Progression table