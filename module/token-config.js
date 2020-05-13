import { isMinimumCoreVersion } from "./lib.js";

export class TokenConfigPF extends TokenConfig {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.template = "systems/pf1/templates/scene/token-config.html";
    options.height = 480;
    return options;
  }

  async getData(...args) {
    let result = await super.getData(...args);

    result.actor = result.actor || {};
    result.actor["vision"] = duplicate(getProperty(this.token.actor, "data.data.attributes.vision") || {});

    result.version = result.version || {};
    result.version.v052 = isMinimumCoreVersion("0.5.2");

    return result;
  }

  async _updateActorData(tokenData) {
    const actorData = {};

    actorData["data.attributes.vision.lowLight"] = tokenData.visionLL;
    actorData["data.attributes.vision.darkvision"] = tokenData.darkvision;

    if (Object.keys(actorData).length) await this.token.actor.update(actorData);
    return super._updateActorData(tokenData);
  }
}
