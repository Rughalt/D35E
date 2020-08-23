# Foundry VTT 3.5 Edition

An implementation of the 3.5e Dungeons and Dragons system for Foundry Virtual
Tabletop (http://foundryvtt.com).

The software component of this system is distributed under the GNUv3 license
while the game content is distributed under the Open Gaming License v1.0a.

## Installation

Install the following game system in FoundryVTT's game system tab: [https://www.dragonshorn.info/dnd35e/system.json](https://www.dragonshorn.info/dnd35e/system.json)

If you wish to manually install the system, you must clone or extract it into
the Data/systems/D35E folder. You may do this by cloning the repository or
downloading a zip archive from the [here](https://www.dragonshorn.info/dnd35e/dnd35e.zip).

## Progress
### Compendium
- Base classes - Done
- Base NPC classes - Done
- Feats - In Compendium, not implemented
- Racial Traits - Partially done
- Racial HD - Partially done

### Systems
Most of the stuff that is the same as in PF1 works. For things that are different:

You can track SRD implementation progress [here](https://github.com/Rughalt/D35E/projects/1)

## Support
This project is done in my free time and for free. If you enjoy it you can support me on [Patreon](https://www.patreon.com/rughalt)

## Packtool
As changing compendiums is not very fun in foundry and nedb is not a proper json, packtool.py can be used to pack and unpack data to sources directory.
Use `packtool unpack <compendium file>` to unpack to json and `packtool pack <compendium file>` to pack to db (generating proper random nedb ids).

## Credits

The entire base work of this system is based on Furyspark's 
on the PF1 system made over [here](https://gitlab.com/Furyspark/foundryvtt-pathfinder1)  and LoopeeDK#9498 work 

Icons provided in source distribution (on this github repository) by 
- J. W. Bjerk (eleazzaar) -- www.jwbjerk.com/art  -- find this and other open art at: http://opengameart.org - CC-BY 3.0
- Various authors at [game-icons.net](https://game-icons.net/)

Rest of icons - provided in binary distribution - are used with persmission of the authors and licensed to use only in this application. Any other use is prohibited.

