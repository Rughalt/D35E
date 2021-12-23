import { ActorPF } from "./actor/entity.js";
import { isMinimumCoreVersion } from "./lib.js";
import {Roll35e} from "./roll.js"

/* -------------------------------------------- */

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {Array} options       The Array of Context Menu options
 * @returns {Array}              The extended options Array including new context choices
 */
export const addChatMessageContextOptions = function (html, options) {
  const canApply = (li) => canvas.tokens.controlled.length && li.find(".damage-roll .dice-total").length;
  const canApplyCritical = (li) => canvas.tokens.controlled.length && li.find(".crit-damage-roll .dice-total").length;
  options.push(
    {
      name: game.i18n.localize("D35E.ApplyDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: (li) => ActorPF.applyDamage(li, 1),
    },
    {
      name: game.i18n.localize("D35E.ApplyHealing"),
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: (li) => ActorPF.applyDamage(li, -1),
    },
    {
      name: game.i18n.localize("D35E.ApplyCriticalDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApplyCritical,
      callback: (li) => ActorPF.applyDamage(li, 1, true),
    },
    {
      name: game.i18n.localize("D35E.ApplyCriticalHealing"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApplyCritical,
      callback: (li) => ActorPF.applyDamage(li, -1, true),
    }
  );
  return options;
};

const duplicateCombatantInitiativeDialog = function (combats, combatantId) {
  const combat = combats.find((c) => c.combatants.filter((o) => o.id === combatantId).length > 0);
  if (!combat) {
    ui.notifications.warn(game.i18n.localize("D35E.WarningNoCombatantFound"));
    return;
  }
  const combatant = combat.combatants.filter((o) => o.id === combatantId)[0];
  if (!combatant) {
    ui.notifications.warn(game.i18n.localize("D35E.WarningNoCombatantFound"));
    return;
  }

  new Dialog(
    {
      title: `${game.i18n.localize("D35E.DuplicateInitiative")}: ${combatant.actor.name}`,
      content: `<div class="flexrow form-group">
      <label>${game.i18n.localize("D35E.InitiativeOffset")}</label>
      <input type="number" name="initiativeOffset" value="0"/>
    </div>`,
      buttons: {
        confirm: {
          label: game.i18n.localize("D35E.Confirm"),
          callback: (html) => {
            const offset = parseFloat(html.find('input[name="initiativeOffset"]').val());
            const prevInitiative = combatant.initiative != null ? combatant.initiative : 0;
            const newInitiative = prevInitiative + offset;
            duplicateCombatantInitiative(combat, combatant, newInitiative);
          },
        },
        cancel: {
          label: game.i18n.localize("Cancel"),
        },
      },
      default: "confirm",
    },
    {
      classes: ["dialog", "D35E", "duplicate-initiative"],
    }
  ).render(true);
};

export const duplicateCombatantInitiative = function (combat, combatant, initiative) {
  console.debug("Duplicating combatant:", combatant);
  combat.createEmbeddedDocuments("Combatant", [
    mergeObject(combatant.toObject(), { initiative: initiative }, { inplace: false }),
  ]);
};

export const addCombatTrackerContextOptions = function (result) {
  result.push({
    name: "D35E.DuplicateInitiative",
    icon: '<i class="fas fa-dice-d20"></i>',
    callback: (li) => duplicateCombatantInitiativeDialog.call(this, this.combats, li.data("combatant-id")),
  });
};

export class CombatPF extends Combat {
  /**
   * Override the default Initiative formula to customize special behaviors of the game system.
   * Apply advantage, proficiency, or bonuses where appropriate
   * Apply the dexterity score as a decimal tiebreaker if requested
   * See Combat._getInitiativeFormula for more detail.
   *
   * @param {ActorPF} actor
   */
  _getInitiativeFormula(actor) {
    const defaultParts = ["1d20", "@attributes.init.total", "@attributes.init.total / 100"];
    const parts = CONFIG.Combat.initiative.formula ? CONFIG.Combat.initiative.formula.split(/\s*\+\s*/) : defaultParts;
    if (!actor) return parts[0] ?? "0";
    return parts.filter((p) => p !== null).join(" + ");
  }

  /**
   * @override
   */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant.id;
    if (!formula) formula = this._getInitiativeFormula(this.combatant.actor);

    let overrideRollMode = null,
      bonus = "",
      stop = false;
    if (game.D35E.showInitiativePrompt) {
      const dialogData = await Combat.implementation.showInitiativeDialog(formula);
      overrideRollMode = dialogData.rollMode;
      bonus = dialogData.bonus || "";
      stop = dialogData.stop || false;
    }

    if (stop) return this;

    // Iterate over Combatants, performing an initiative roll for each
    const [updates, messages] = await ids.reduce(
      async (results, id, i) => {
        const result = await results;
        const [updates, messages] = result;

        // Get Combatant data
        const c = this.combatants.get(id);
        if (!c) return results;
        const actorData = c.actor ? c.actor.data.data : {};
        formula = formula || this._getInitiativeFormula(c.actor ? c.actor : null);

        actorData.bonus = bonus;
        // Add bonus
        if (bonus.length > 0 && i === 0) {
          formula += " + @bonus";
        }

        // Roll initiative
        const rollMode =
          overrideRollMode != null
            ? overrideRollMode
            : messageOptions.rollMode || c.token.hidden || c.hidden
            ? "gmroll"
            : "roll";
        const roll = Roll35e.safeRoll(formula, actorData);
        if (roll.err) ui.notifications.warn(roll.err.message);
        updates.push({ _id: id, initiative: roll.total });

        const [notes, notesHTML] = c.actor.getInitiativeContextNotes();

        // Create roll template data
        const rollData = mergeObject(
          {
            user: game.user.id,
            formula: roll.formula,
            tooltip: await roll.getTooltip(),
            total: roll.total,
          },
          notes.length > 0 ? { hasExtraText: true, extraText: notesHTML } : {}
        );

        // Create chat data
        const chatData = mergeObject(
          {
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.CHAT,
            rollMode: rollMode,
            sound: CONFIG.sounds.dice,
            speaker: {
              scene: canvas.scene.id,
              actor: c.actor ? c.actor.id : null,
              token: c.token.id,
              alias: c.token.name,
            },
            flavor: game.i18n.localize("D35E.RollsForInitiative").format(c.token.name),
            roll: roll,
            content: await renderTemplate("systems/D35E/templates/chat/roll-ext.hbs", rollData),
          },
          messageOptions
        );
        setProperty(chatData, "flags.D35E.subject.core", "init");

        // Handle different roll modes
        ChatMessage.applyRollMode(chatData, chatData.rollMode);

        if (i > 0) chatData.sound = null; // Only play 1 sound for the whole set
        messages.push(chatData);

        // Return the Roll and the chat data
        return results;
      },
      [[], []]
    );
    if (!updates.length) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    if (updateTurn) await this.update({ turn: this.turns.findIndex((t) => t.id === currentId) });

    // Create multiple chat messages
    await ChatMessage.create(messages);

    // Return the updated Combat
    return this;
  }

  static showInitiativeDialog = function (formula = null) {
    return new Promise((resolve) => {
      const template = "systems/D35E/templates/chat/roll-dialog.hbs";
      let rollMode = game.settings.get("core", "rollMode");
      const dialogData = {
        formula: formula ? formula : "",
        rollMode: rollMode,
        rollModes: CONFIG.Dice.rollModes,
      };
      // Create buttons object
      const buttons = {
        normal: {
          label: "Roll",
          callback: (html) => {
            rollMode = html.find('[name="rollMode"]').val();
            const bonus = html.find('[name="bonus"]').val();
            resolve({ rollMode: rollMode, bonus: bonus });
          },
        },
      };
      // Show dialog
      renderTemplate(template, dialogData).then((dlg) => {
        new Dialog(
          {
            title: game.i18n.localize("D35E.InitiativeBonus"),
            content: dlg,
            buttons: buttons,
            default: "normal",
            close: (html) => {
              resolve({ stop: true });
            },
          },
          {
            classes: ["dialog", "D35E", "roll-initiative"],
          }
        ).render(true);
      });
    });
  };

  /**
   * Process current combatant: expire active effects & buffs.
   */
  async _processCurrentCombatant() {
    try {
      this.combatant?.actor?.expireActiveEffects();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @override
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    const combat = await super.nextRound();
    // TODO: Process skipped turns.
    await this._processCurrentCombatant();
    return combat;
  }

  /**
   * @override
   * @returns {Promise<Combat>}
   */
  async nextTurn() {
    const combat = await super.nextTurn();
    await this._processCurrentCombatant();
    return combat;
  }
}
