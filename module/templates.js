/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [

    // Actor Sheet Partials
    "systems/D35E/templates/actors/parts/actor-traits.html",
    "systems/D35E/templates/actors/parts/actor-inventory.html",
    "systems/D35E/templates/actors/parts/actor-features.html",
    "systems/D35E/templates/actors/parts/actor-spellbook-front.html",
    "systems/D35E/templates/actors/parts/actor-spellbook.html",
    "systems/D35E/templates/actors/parts/actor-skills-front.html",
    "systems/D35E/templates/actors/parts/actor-skills.html",
    "systems/D35E/templates/actors/parts/actor-defenses.html",
    "systems/D35E/templates/actors/parts/actor-buffs.html",
    "systems/D35E/templates/actors/parts/actor-attacks.html",

    // Item Sheet Partials
    "systems/D35E/templates/items/parts/item-action.html",
    "systems/D35E/templates/items/parts/item-activation.html",
    "systems/D35E/templates/items/parts/item-description.html",
    "systems/D35E/templates/items/parts/item-changes.html",
    "systems/D35E/templates/items/parts/item-notes.html",
    "systems/D35E/templates/items/parts/item-template.html",

    // Misc
    "systems/D35E/templates/misc/token-config.html",

    // Apps
    "systems/D35E/templates/apps/attack-roll-dialog.html",

    // Chat
    "systems/D35E/templates/chat/roll-ext.html",
    "systems/D35E/templates/chat/defenses.html",

    // Internal Rendering Partials
    "systems/D35E/templates/internal/spell-description.html",
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};
