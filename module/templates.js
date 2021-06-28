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
    "systems/D35E/templates/actors/parts/actor-deck-front.html",
    "systems/D35E/templates/actors/parts/actor-deck.html",
    "systems/D35E/templates/actors/parts/actor-skills-front.html",
    "systems/D35E/templates/actors/parts/actor-skills.html",
    "systems/D35E/templates/actors/parts/actor-defenses.html",
    "systems/D35E/templates/actors/parts/actor-buffs.html",
    "systems/D35E/templates/actors/parts/actor-attacks.html",
    "systems/D35E/templates/actors/parts/actor-details.html",
    "systems/D35E/templates/actors/parts/actor-attributes.html",
    "systems/D35E/templates/actors/parts/actor-config.html",

    // Item Sheet Partials
    "systems/D35E/templates/items/parts/item-action.html",
    "systems/D35E/templates/items/parts/item-links.html",
    "systems/D35E/templates/items/parts/item-activation.html",
    "systems/D35E/templates/items/parts/item-description.html",
    "systems/D35E/templates/items/parts/item-changes.html",
    "systems/D35E/templates/items/parts/item-notes.html",
    "systems/D35E/templates/items/parts/item-template.html",
    "systems/D35E/templates/items/parts/item-children.html",
    "systems/D35E/templates/items/parts/item-enhancement.html",
    "systems/D35E/templates/items/parts/item-light.html",
    "systems/D35E/templates/items/parts/item-customization.html",
    "systems/D35E/templates/items/parts/item-conditionals.html",
    "systems/D35E/templates/items/parts/item-senses.html",

    // Misc
    "systems/D35E/templates/internal/token-config.html",

    // Apps
    "systems/D35E/templates/apps/attack-roll-dialog.html",
    "systems/D35E/templates/apps/vision-permission.html",

    // Chat
    "systems/D35E/templates/chat/roll-ext.html",
    "systems/D35E/templates/chat/defenses.html",
    "systems/D35E/templates/chat/turn-undead.html",

    // Internal Rendering Partials
    "systems/D35E/templates/internal/spell-description.html",
    "systems/D35E/templates/internal/consumable-description.html",
    "systems/D35E/templates/internal/shapechange-description.html",
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};
