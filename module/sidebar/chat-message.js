import { isMinimumCoreVersion } from "../lib.js";

export class ChatMessagePF extends ChatMessage {
  async render() {
    if (isMinimumCoreVersion("0.5.6")) return this._render056();
    return this._render055();
  }

  async _render055() {

    // Determine some metadata
    const isWhisper = this.data.whisper.length;

    // Construct message data
    const messageData = {
      user: game.user,
      author: this.user,
      alias: this.alias,
      message: duplicate(this.data),
      cssClass: [
        this.data.type === CONST.CHAT_MESSAGE_TYPES.IC ? "ic" : null,
        this.data.type === CONST.CHAT_MESSAGE_TYPES.EMOTE ? "emote" : null,
        isWhisper ? "whisper" : null,
        this.data.blind ? "blind": null
      ].filter(c => c !== null).join(" "),
      isWhisper: this.data.whisper.some(id => id !== game.user.id),
      whisperTo: this.data.whisper.map(u => {
        let user = game.users.get(u);
        return user ? user.name : null;
      }).filter(n => n !== null).join(", ")
    };

    // Enrich some data for dice rolls
    if (this.isRoll && !this.getFlag("D35E", "noRollRender")) {
      const isVisible = this.isRollVisible;
      messageData.message.content = await this.roll.render({isPrivate: !isVisible});
      if ( isWhisper ) {
        const subject = this.data.user === game.user.id ? "You" : this.user.name;
        messageData.message.flavor = messageData.message.flavor || `${subject} privately rolled some dice`;
      }
      if ( !isVisible ) {
        messageData.isWhisper = false;
        messageData.alias = this.user.name;
      }
    }

    // Define a border color
    if ( this.data.type === CONST.CHAT_MESSAGE_TYPES.OOC ) {
      messageData.borderColor = this.user.color;
    }

    // Render the chat message
    let html = await renderTemplate(CONFIG.ChatMessage.template, messageData);
    html = $(html);

    // Call a hook for the rendered ChatMessage data
    Hooks.call("renderChatMessage", this, html, messageData);
    return html;
  }

  async _render056() {

    // Determine some metadata
    const data = duplicate(this.data);
    const isWhisper = this.data.whisper.length;
    const isVisible = this.isContentVisible;

    // Construct message data
    const messageData = {
      message: data,
      user: game.user,
      author: this.user,
      alias: this.alias,
      cssClass: [
        this.data.type === CONST.CHAT_MESSAGE_TYPES.IC ? "ic" : null,
        this.data.type === CONST.CHAT_MESSAGE_TYPES.EMOTE ? "emote" : null,
        isWhisper ? "whisper" : null,
        this.data.blind ? "blind": null
      ].filter(c => c !== null).join(" "),
      isWhisper: this.data.whisper.some(id => id !== game.user.id),
      whisperTo: this.data.whisper.map(u => {
        let user = game.users.get(u);
        return user ? user.name : null;
      }).filter(n => n !== null).join(", ")
    };

    // Enrich some data for dice rolls
    if (this.isRoll && !this.getFlag("D35E", "noRollRender")) {

      // Render HTML if needed
      if ( data.content.slice(0, 1) !== "<" ) {
        data.content = await this.roll.render({isPrivate: !isVisible});
      }

      // Conceal some private roll information
      if ( !isVisible ) {
        data.flavor = `${this.user.name} privately rolled some dice`;
        messageData.isWhisper = false;
        messageData.alias = this.user.name;
      }
    }

    // Define a border color
    if ( this.data.type === CONST.CHAT_MESSAGE_TYPES.OOC ) {
      messageData.borderColor = this.user.color;
    }

    // Render the chat message
    let html = await renderTemplate(CONFIG.ChatMessage.template, messageData);
    html = $(html);

    // Call a hook for the rendered ChatMessage data
    Hooks.call("renderChatMessage", this, html, messageData);
    return html;
  }
}
