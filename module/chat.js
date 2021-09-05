/**
 * Optionally hide the display of chat card action buttons which cannot be performed by the user
 */
import {ActorPF} from "./actor/entity.js";

export const displayChatActionButtons = function(message, html, data) {
  const chatCard = html.find(".D35E.chat-card");
  if (chatCard.length > 0) {

    // If the user is the message author or the actor owner, proceed

    const buttons = chatCard.find("button[data-action]:not(.everyone)");
    buttons.each((a, btn) => {
      if (game.settings.get("D35E", "allowPlayersApplyActions"))
        $(btn).addClass('everyone')
    });
    const actor = game.actors.get(data.message.speaker.actor);
    if (actor && actor.isOwner) return;
    else if (game.user.isGM || (data.author.id === game.user.id)) return;

    // Otherwise make buttons disabled, but show the actions action buttons
    buttons.each((a, btn) => {
      if (!game.settings.get("D35E", "allowPlayersApplyActions"))
        btn.disabled = true
    });
  }
};

/* -------------------------------------------- */

export const createCustomChatMessage = async function(chatTemplate, chatTemplateData={}, chatData={}, {rolls=[]}={}) {
  let rollMode = game.settings.get("core", "rollMode");
  chatData = mergeObject({
    rollMode: rollMode,
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.CHAT,
  }, chatData);
  chatData.content = await renderTemplate(chatTemplate, chatTemplateData);
  // Handle different roll modes
  switch (chatData.rollMode) {
    case "gmroll":
      chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u.id);
      break;
    case "selfroll":
      chatData["whisper"] = [game.user.id];
      break;
    case "blindroll":
      chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u.id);
      chatData["blind"] = true;
      break;
  }

  // Dice So Nice integration
  if (chatData.roll != null && rolls.length === 0) rolls = [chatData.roll];
  if (game.dice3d) {
    let promises = []
    for (let roll of rolls) {
      promises.push(game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind));
    }
    await Promise.all(promises)
    chatData.sound = null;
  }

  ChatMessage.create(chatData);
  return true;
};

export const hideRollInfo = function(app, html, data) {
  const whisper = app.data.whisper || [];
  const isBlind = whisper.length && app.data.blind;
  const isVisible = whisper.length ? (whisper.includes(game.user.id) || (app.isAuthor && !isBlind)) : true;
  if (!isVisible) {
    html.find(".dice-formula").text("???");
    html.find(".dice-total").text("?");
    html.find(".dice").text("");
    html.find(".success").removeClass("success");
    html.find(".failure").removeClass("failure");
  }
};

export const hideGMSensitiveInfo = function(app, html, data) {
  if (game.user.isGM) return;

  let speaker = app.data.speaker,
    actor = speaker != null ? (speaker.actor ? game.actors.get(speaker.actor) : game.actors.tokens[speaker.token]) : null;
  //console.log('D35E | Message | Cleaning ', actor, app, html)
  if (!actor || (actor && actor.testUserPermission(game.user, "LIMITED"))) return;

  // Hide info
  html.find(".gm-sensitive").remove();


  if (game.settings.get("D35E", "playersNoDamageDetails")) {
    html.find(".toggle-content").remove();
  }

  if (game.settings.get("D35E", "playersNoDCDetails")) {
    html.find(".dc-value").text("?");
  }
};


export const enableToggles = function(app, html, data) {
  html.on('click', '.toggle-header', (event) => {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".toggle-box");
    const content = card.querySelector(".toggle-content");
    $(content).slideToggle(400)
  })
}

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
  let canApply = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.isRoll && message?.isContentVisible && canvas.tokens?.controlled.length;
  };
  options.push(
      {
        name: game.i18n.localize("D35E.ChatContextDamage"),
        icon: '<i class="fas fa-user-minus"></i>',
        condition: canApply,
        callback: li => applyChatCardDamage(li, 1)
      },
      {
        name: game.i18n.localize("D35E.ChatContextHealing"),
        icon: '<i class="fas fa-user-plus"></i>',
        condition: canApply,
        callback: li => applyChatCardDamage(li, -1)
      },
      {
        name: game.i18n.localize("D35E.ChatContextDoubleDamage"),
        icon: '<i class="fas fa-user-injured"></i>',
        condition: canApply,
        callback: li => applyChatCardDamage(li, 2)
      },
      {
        name: game.i18n.localize("D35E.ChatContextHalfDamage"),
        icon: '<i class="fas fa-user-shield"></i>',
        condition: canApply,
        callback: li => applyChatCardDamage(li, 0.5)
      }
  );
  return options;
};

/* -------------------------------------------- */

/**
 * Apply rolled dice damage to the token or tokens which are currently controlled.
 * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
 *
 * @param {HTMLElement} li      The chat entry which contains the roll data
 * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
 * @return {Promise}
 */
function applyChatCardDamage(li, multiplier) {
  const message = game.messages.get(li.data("messageId"));
  const roll = message.roll;
  return Promise.all(canvas.tokens.controlled.map(t => {
    const a = t.actor;
    ActorPF.applyDamage(null,null,null,null,null,null,null,Math.floor(roll.total * multiplier),null,null,null,null,false,true, a);
  }));
}
