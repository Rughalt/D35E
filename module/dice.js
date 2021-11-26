import { ChatMessagePF } from "./sidebar/chat-message.js";

import {Roll35e} from "./roll.js"

export class DicePF {

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the d20 roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} takeTwenty    Allow rolling with take twenty (and therefore also with take ten)
   * @param {Boolean} situational   Allow for an arbitrary situational bonus field
   * @param {Boolean} fastForward   Allow fast-forward advantage selection
   * @param {Number} critical       The value of d20 result which represents a critical success
   * @param {Number} fumble         The value of d20 result which represents a critical failure
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   * @param {Array} extraRolls      An array containing bonuses/penalties for extra rolls
   * @param {Boolean} autoRender    Whether to automatically render the chat messages
   */
  static async d20Roll({event, parts, data, template, title, speaker, flavor, takeTwenty=true, situational=true,
                  fastForward=true, critical=20, fumble=1, treshold=null, onClose, dialogOptions, extraRolls=[], chatTemplate, chatTemplateData,
                  staticRoll=null }) {
    // Handle input arguments
    flavor = flavor || title;
    let rollMode = game.settings.get("core", "rollMode");
    let rolled = false;

    // Inner roll function
    let _roll = async (parts, setRoll, form) => {
      const originalFlavor = flavor;
      rollMode = form ? form.find('[name="rollMode"]').val() : rollMode;
      for (let a = 0; a < 1 + extraRolls.length; a++) {
        flavor = originalFlavor;
        let curParts = duplicate(parts);
        // Don't include situational bonus unless it is defined
        data.bonus = form ? form.find('[name="bonus"]').val() : 0;
        if (!data.bonus && curParts.indexOf("@bonus") !== -1) curParts.pop();

        // Extra roll specifics
        if (a >= 1) {
          let extraRoll = extraRolls[a-1];
          curParts.push(extraRoll.bonus);
          flavor += ` <div class="extra-roll-label">${extraRoll.label}</div>`;
        }

        // Do set roll
        if (setRoll != null && setRoll >= 0) {
          curParts[0] = `${setRoll}`;
          flavor += ` (Take ${setRoll})`;
        }

        // Execute the roll
        let roll = new Roll35e(curParts.join(" + "), data).roll();

        // Convert the roll to a chat message
        if (chatTemplate) {
          // Create roll template data
          const d20 = roll.terms[0];
          const rollData = mergeObject({
            user: game.user._id,
            formula: roll.formula,
            tooltip: await roll.getTooltip(),
            total: roll.total,
            isCrit: treshold ? roll.total >= treshold : d20.total >= critical,
            isFumble: d20.total <= fumble,
          }, chatTemplateData || {});

          // Create chat data
          let chatData = {
            user: game.user._id,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: a === 0 ? CONFIG.sounds.dice : null,
            speaker: speaker,
            content: await renderTemplate(chatTemplate, rollData),
            "flags.D35E.noRollRender": true,
          };
          // Handle different roll modes
          switch (rollMode) {
            case "gmroll":
              chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
              break;
            case "selfroll":
              chatData["whisper"] = [game.user._id];
              break;
            case "blindroll":
              chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
              chatData["blind"] = true;
              break;
          }

          // Send message
          rolled = true;
          chatData = mergeObject(await roll.toMessage({flavor}, { create: false }), chatData);
          // Dice So Nice integration
          // if (game.dice3d != null) {
          //   await game.dice3d.showForRoll(roll, chatData.whisper, chatData.blind);
          //   chatData.sound = null;
          // }

          await ChatMessage.create(chatData);
        }
        else {
          rolled = true;
          await roll.toMessage({
            speaker: speaker,
            flavor: flavor,
            rollMode: rollMode,
            sound: a === 0 ? CONFIG.sounds.dice : null
          });
        }
      }
    };

    // Modify the roll and handle fast-forwarding
    parts = ["1d20"].concat(parts);
    if (fastForward === true || event.shiftKey) return _roll(parts, staticRoll);
    else parts = parts.concat(["@bonus"]);

    // Render modal dialog
    template = template || "systems/D35E/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.Dice.rollModes
    };
    const html = await renderTemplate(template, dialogData);

    let roll;
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content: html,
        buttons: {
          normal: {
            label: "Normal",
            callback: html => roll = _roll(parts, staticRoll != null ? staticRoll : -1, html)
          },
          takeTen: {
            label: "Take 10",
            condition: takeTwenty,
            callback: html => roll = _roll(parts, 10, html)
          },
          takeTwenty: {
            label: "Take 20",
            condition: takeTwenty,
            callback: html => roll = _roll(parts, 20, html)
          }
        },
        default: "normal",
        close: html => {
          if ( onClose ) onClose(html, parts, data);
          resolve(rolled ? roll : false);
        }
      }, dialogOptions).render(true);
    });
  }

  /* -------------------------------------------- */

  /**
   * A standardized helper function for managing core 5e "d20 rolls"
   *
   * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
   * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
   *
   * @param {Event} event           The triggering event which initiated the roll
   * @param {Array} parts           The dice roll component parts, excluding the initial d20
   * @param {Actor} actor           The Actor making the damage roll
   * @param {Object} data           Actor or item data against which to parse the roll
   * @param {String} template       The HTML template used to render the roll dialog
   * @param {String} title          The dice roll UI window title
   * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
   * @param {Function} flavor       A callable function for determining the chat message flavor given parts and data
   * @param {Boolean} critical      Allow critical hits to be chosen
   * @param {Function} onClose      Callback for actions to take when the dialog form is closed
   * @param {Object} dialogOptions  Modal dialog options
   */
  static async damageRoll({event={}, parts, actor, data, template, title, speaker, flavor, critical=true, onClose, dialogOptions, chatTemplate, chatTemplateData }) {
    flavor = flavor || title;
    let rollMode = game.settings.get("core", "rollMode");
    let rolled = false;

    // Inner roll function
    const _roll = async (crit, form) => {
      // Don't include situational bonus unless it is defined
      data.bonus = form ? form.find('[name="bonus"]').val() : 0;

      // Detemrine critical multiplier
      data["critMult"] = crit ? data.item.ability.critMult : 1;
      // Determine damage ability
      data["ablMult"] = 0;
      if (data.item.ability.damageMult != null) {
        data["ablMult"] = data.item.ability.damageMult;
      }

      let roll = new Roll35e(parts.join("+"), data);
      if ( crit === true ) {
        let mult = data.item.ability.critMult || 2;

        // Update first damage part
        roll.alter(0, mult);
        flavor = `${flavor} (Critical)`;
      }

      roll.roll();

      // Convert the roll to a chat message
      if (chatTemplate) {
        // Create roll template data
        const rollData = mergeObject({
          user: game.user._id,
          formula: roll.formula,
          tooltip: await roll.getTooltip(),
          total: roll.total,
        }, chatTemplateData || {});

        // Create chat data
        let chatData = {
          user: game.user._id,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          rollMode: game.settings.get("core", "rollMode"),
          sound: CONFIG.sounds.dice,
          speaker: speaker,
          flavor: flavor,
          rollMode: rollMode,
          roll: roll,
          content: await renderTemplate(chatTemplate, rollData),
          useCustomContent: true,
        };
        // Handle different roll modes
        switch (chatData.rollMode) {
          case "gmroll":
            chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
            break;
          case "selfroll":
            chatData["whisper"] = [game.user._id];
            break;
          case "blindroll":
            chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
            chatData["blind"] = true;
        }

        // Send message
        rolled = true;
        ChatMessagePF.create(chatData);
      }
      else {
        rolled = true;
        roll.toMessage({
          speaker: speaker,
          flavor: flavor,
          rollMode: rollMode
        });
      }

      // Return the Roll object
      return roll;
    };

    // Modify the roll and handle fast-forwarding
    if (!event.shiftKey) return _roll(event.ctrlKey);
    else parts = parts.concat(["@bonus"]);

    // Construct dialog data
    template = template || "systems/D35E/templates/chat/roll-dialog.html";
    let dialogData = {
      formula: parts.join(" + "),
      data: data,
      rollMode: rollMode,
      rollModes: CONFIG.Dice.rollModes
    };
    const html = await renderTemplate(template, dialogData);

    // Render modal dialog
    let roll;
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content: html,
        buttons: {
          normal: {
            label: critical ? "Normal" : "Roll",
            callback: html => roll = _roll(false, html)
          },
          critical: {
            condition: critical,
            label: "Critical Hit",
            callback: html => roll = _roll(true, html)
          },
        },
        default: "normal",
        close: html => {
          if (onClose) onClose(html, parts, data);
          resolve(rolled ? roll : false);
        }
      }, dialogOptions).render(true);
    });
  }

  static messageRoll({data, msgStr}) {
    let re = /\[\[(.+)\]\]/g;
    return msgStr.replace(re, (_, p1) => {
      const roll = new Roll35e(p1, data).roll();
      return roll.total.toString();
    });

    return msgStr;
  }
}

export const _preProcessDiceFormula = function(formula, data={}) {
  function _fillTemplate(templateString, templateVars){
    if (templateString.indexOf('$') !== -1)
      return new Function("return `"+templateString +"`;").call(templateVars);
    else
      return formula;
  }
  formula = _fillTemplate(formula, data)
  // Replace parentheses with semicolons to use for splitting
  let toSplit = formula.replace(/([A-z]+)?\(/g, (match, prefix) => {
    return (prefix in game.D35E.rollPreProcess || prefix in Math) ? `;${prefix};(;` : ";(;";
  }).replace(/\)/g, ";);");
  let terms = toSplit.split(";");

  // Match parenthetical groups
  let nOpen = 0,
      nOpenPreProcess = [];
  terms = terms.reduce((arr, t) => {

    // Handle cases where the prior term is a math function
    const beginPreProcessFn = (t[0] === "(") && (arr[arr.length-1] in game.D35E.rollPreProcess);
    if (beginPreProcessFn) nOpenPreProcess.push([arr.length-1, nOpen]);
    const beginMathFn = (t[0] === "(") && (arr[arr.length-1] in Math);
    if (beginMathFn && nOpenPreProcess.length > 0) nOpenPreProcess.push([arr.length-1, nOpen]);

    // Add terms to the array
    arr.push(t);

    // Increment the number of open parentheses
    if ( t === "(" ) nOpen++;
    if ( (nOpen > 0) && (t === ")") ) {
      nOpen--;
      for (let a = 0; a < nOpenPreProcess.length; a++) {
        let obj = nOpenPreProcess[a];
        // End pre process function
        if (obj[1] === nOpen) {
          const sliceLen = arr.length - obj[0];
          let fnData = arr.splice(obj[0], sliceLen),
              fn = fnData[0];
          let fnParams = fnData.slice(2, -1).reduce((cur, s) => {
            cur.push(...s.split(/\s*,\s*/));
            return cur;
          }, []).map(o => {
            return new Roll35e(o, data).roll().total;
          }).filter(o => o !== "" && o != null);
          if (fn in Math) {
            arr.push(Math[fn](...fnParams).toString());
          }
          else {
            arr.push(game.D35E.rollPreProcess[fn](...fnParams).toString());
          }

          nOpenPreProcess.splice(a, 1);
          a--;
        }
      }
    }
    return arr;
  }, []);

  return terms.join("");
};

