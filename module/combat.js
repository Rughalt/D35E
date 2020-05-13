import { ActorPF } from "./actor/entity.js";
import { isMinimumCoreVersion } from "./lib.js";

/* -------------------------------------------- */

/**
 * Override the default Initiative formula to customize special behaviors of the D&D5e system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 */
export const _getInitiativeFormula = function(actor) {
  if (!actor) return "1d20";
  const parts = ["1d20", "@attributes.init.total", "@attributes.init.total / 100"];
  return parts.filter(p => p !== null).join(" + ");
};

Combat.showInitiativeDialog = function(formula=null) {
  return new Promise(resolve => {
    let template = "systems/pf1/templates/chat/roll-dialog.html";
    let rollMode = game.settings.get("core", "rollMode");
    let dialogData = {
      formula: formula ? formula : "",
      rollMode: rollMode,
      rollModes: CONFIG.rollModes
    };
    // Create buttons object
    let buttons = {
      normal: {
        label: "Roll",
        callback: html => {
          rollMode = html.find('[name="rollMode"]').val();
          const bonus = html.find('[name="bonus"]').val();
          resolve({ rollMode: rollMode, bonus: bonus });
        },
      }
    };
    // Show dialog
    renderTemplate(template, dialogData).then(dlg => {
      new Dialog({
        title: game.i18n.localize("PF1.InitiativeBonus"),
        content: dlg,
        buttons: buttons,
        default: "normal",
        close: html => {
          resolve({ stop: true });
        }
      }, {}).render(true);
    });
  });
};

export const _rollInitiative = async function(ids, formula=null, messageOptions={}) {

  // Structure input data
  ids = typeof ids === "string" ? [ids] : ids;
  const currentId = this.combatant._id;
  if (!formula) formula = _getInitiativeFormula(this.combatant.actor);

  let overrideRollMode = null,
    bonus = "",
    stop = false;
  if (keyboard.isDown("Shift")) {
    const dialogData = await Combat.showInitiativeDialog(formula);
    overrideRollMode = dialogData.rollMode;
    bonus = dialogData.bonus || "";
    stop = dialogData.stop || false;
  }

  if (stop) return this;

  // Iterate over Combatants, performing an initiative roll for each
  const [updates, messages] = ids.reduce((results, id, i) => {
    let [updates, messages] = results;

    // Get Combatant data
    const c = this.getCombatant(id);
    if ( !c ) return results;
    const actorData = c.actor ? c.actor.data.data : {};
    formula = formula || this._getInitiativeFormula(c.actor ? c.actor : null);

    actorData.bonus = bonus;
    // Add bonus
    if (bonus.length > 0 && i === 0) {
      formula += " + @bonus";
    }

    // Roll initiative
    const rollMode = overrideRollMode != null ? overrideRollMode : messageOptions.rollMode || (c.token.hidden || c.hidden) ? "gmroll" : "roll";
    const roll = new Roll(formula, actorData).roll();
    updates.push({_id: id, initiative: roll.total});

    // Construct chat message data
    let messageData = mergeObject({
      speaker: {
        scene: canvas.scene._id,
        actor: c.actor ? c.actor._id : null,
        token: c.token._id,
        alias: c.token.name
      },
      flavor: game.i18n.localize("PF1.RollsForInitiative").format(c.token.name)
    }, messageOptions);
    const chatData = roll.toMessage(messageData, {rollMode, create:false});
    if ( i > 0 ) chatData.sound = null;   // Only play 1 sound for the whole set
    messages.push(chatData);

    // Return the Roll and the chat data
    return results;
  }, [[], []]);
  if ( !updates.length ) return this;

  // Update multiple combatants
  if (isMinimumCoreVersion("0.5.4")) await this.updateEmbeddedEntity("Combatant", updates);
  else await this.updateManyEmbeddedEntities("Combatant", updates);

  // Ensure the turn order remains with the same combatant
  await this.update({turn: this.turns.findIndex(t => t._id === currentId)});

  // Create multiple chat messages
  if (isMinimumCoreVersion("0.5.4")) await ChatMessage.create(messages);
  else await ChatMessage.createMany(messages);

  // Return the updated Combat
  return this;
};

/* -------------------------------------------- */

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {Array} options       The Array of Context Menu options
 *
 * @return {Array}              The extended options Array including new context choices
 */
export const addChatMessageContextOptions = function(html, options) {
  let canApply = li => canvas.tokens.controlledTokens.length && li.find(".damage-roll .dice-total").length;
  let canApplyCritical = li => canvas.tokens.controlledTokens.length && li.find(".crit-damage-roll .dice-total").length;
  options.push(
    {
      name: game.i18n.localize("PF1.ApplyDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: li => ActorPF.applyDamage(li, 1)
    },
    {
      name: game.i18n.localize("PF1.ApplyHealing"),
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: li => ActorPF.applyDamage(li, -1)
    },
    {
      name: game.i18n.localize("PF1.ApplyCriticalDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApplyCritical,
      callback: li => ActorPF.applyDamage(li, 1, true)
    },
    {
      name: game.i18n.localize("PF1.ApplyCriticalHealing"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApplyCritical,
      callback: li => ActorPF.applyDamage(li, -1, true)
    },
  );
  return options;
};
