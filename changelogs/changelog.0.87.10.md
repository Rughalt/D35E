### Features
- Automated AC checking when applying damage
    - Added support for Optional AC modifiers, added Optional AC modifiers to feats in compendium
- Fortification - keeping information about fortification critical hit immunity
    - Automatically resolved on Apply Dialog critical hit check
    - Possibility to add via changes
    - Implemented in all Racial HD and Templates in Compendium, added to Fortification enhancement
    
### Changes
- Added new Sneak Attack class feature that uses Combat Changes mechanism. It will replace old one on chars on update.
- Added new Turn/Rebuke undead feature (to allow non-standard Turn/Rebuke creatures in future). It will be added to chars on update.

### Bug Fixes
- Fixed rolling skills from summary tab on Character sheet
- Fixed some icons having ".PNG" file extension instead of ".png"
- Fixed classes/races with EL set to empty breaking Exp calculation
- Fixed domain spell slot assignments
- Fixed class skills/non-class when using level progression
- [#162](https://github.com/Rughalt/D35E/issues/162) - Token light radius fixes
- [#168](https://github.com/Rughalt/D35E/issues/168) - Added Change target for Touch AC
- [#166](https://github.com/Rughalt/D35E/issues/166) - +1 Armor Enhancement correctly adds +1 by default
- Other minor fixes