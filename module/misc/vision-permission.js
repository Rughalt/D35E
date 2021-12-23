export class VisionPermissionSheet extends FormApplication {
    constructor(object, options) {
      super(object, options);
  
      // Register the sheet as an active Application for the Document
      this.object.apps[this.appId] = this;
    }
  
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["sheet", "vision-permission"],
        template: "systems/D35E/templates/apps/vision-permission.hbs",
        width: 300,
        height: "auto",
        closeOnSubmit: true,
        submitOnClose: false,
        submitOnChange: false,
      });
    }
  
    get title() {
      return this.token && !this.token.data.actorLink
        ? `Vision Permissions: [Token] ${this.object.name}`
        : `Vision Permissions: ${this.object.name}`;
    }
    get isLinkedToken() {
      return this.token ? this.token.data.actorLink : false;
    }
  
    async _updateObject(event, formData) {
      await this.object.setFlag("D35E", "visionPermission", formData);
      game.socket.emit("system.D35E", { eventType: "redrawCanvas" });
    }
  
    async getData() {
      let data = super.getData();
      data = mergeObject(data, this.object.getFlag("D35E", "visionPermission"));
      data.users = data.users || {};
  
      data.defaultLevels = [
        { level: "no", name: game.i18n.localize("D35E.No") },
        { level: "yes", name: game.i18n.localize("D35E.Yes") },
      ];
      data.levels = [{ level: "default", name: game.i18n.localize("D35E.Default") }, ...data.defaultLevels];
      if (data.default == null) data.default = "no";
  
      data.users = game.users.reduce((cur, o) => {
        if (!o.isGM) {
          cur[o.id] = {
            user: o,
            level: data.users[o.id]?.level || "default",
            hidden: false,
          };
        }
  
        return cur;
      }, {});
  
      return data;
    }
  }
  
  /**
   * Check if a Token can be a vison source for the current user (due to shared vision).
   *
   * @param {Token} token - The Token
   * @returns {boolean} Whether token is a possible vision source
   */
  export const hasTokenVision = function (token) {
    if (!token.actor) return false;
    if (token.actor.testUserPermission(game.user, "OWNER")) return true;
  
    const visionFlag = token.actor.getFlag("D35E", "visionPermission");
    if (!visionFlag || !visionFlag.users[game.user.id]) return false;
    if (visionFlag.users[game.user.id].level === "yes") return true;
    if (visionFlag.users[game.user.id].level === "default" && visionFlag.default === "yes") return true;
  
    return false;
  };
  