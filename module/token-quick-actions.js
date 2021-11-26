export class TokenQuickActions {

  static async addTop3Attacks(app, html, data) {

    let actorId = data.actorId,
      actor = game.actors.get(actorId);
    if (data._id && game.actors.tokens[data._id] != null) {
      actorId = data._id;
      actor = game.actors.tokens[actorId];
    }

    if (actor == null)
        return;
    
    let quickActions = '<div class="col actions"><div class="below">'
    let ammoCounter = '<div class="col actions"><div class="below" style="bottom: -60px">'
    let items = actor.data.items.filter(o => (o.type === "attack" || o.type === "spell" || o.type === "full-attack" || o.type === "feat") && getProperty(o.data, "data.showInQuickbar") === true).sort((a, b) => {      return a.data.sort - b.data.sort;
    });
    items.forEach(function(item) {
      const icon = item.img;
      let title = "";
      if      (item.type === "attack") title = game.i18n.localize("D35E.AttackWith").format(item.name);
      else if (item.type === "spell")  title = game.i18n.localize("D35E.AttackWithSpell").format(item.name);
      else if (item.type === "feat")   title = game.i18n.localize("D35E.AttackWithFeat").format(item.name);
      const type = item.type;
      quickActions += `<div id="${type}-${item._id}" class="control-icon token-quick-action"><img src="${icon}" width="36" height="36" title="${title}"></div>`;
    });
    let ammo = actor.data.items.filter(o => (o.type === "loot") && getProperty(o.data, "data.showInQuickbar") === true).sort((a, b) => {      return a.data.sort - b.data.sort;
    });

    ammo.forEach(function(item) {
      const icon = item.img;
      let title = "";
      title = `${item.name} (${item.data.data.quantity})`;
      const type = item.type;
      ammoCounter += `<div id="${type}-${item._id}" class="control-icon"  title="${title}"><img style="position: absolute" src="${icon}" width="36" height="36"><span style="position: relative" >${item.data.data.quantity}</span></div>`;
    });

    html.find('.col.middle').after(quickActions + '</div></div>');
    html.find('.col.middle').after(ammoCounter + '</div></div>');
    
    items.forEach(function(item) {
      const type = item.type;
      html.find(`#${type}-${item._id}`).click(function(event) {
        game.D35E.rollItemMacro(item.name, {
          itemId: item._id,
          itemType: type,
          actorId: actorId
        });
      });
    });
  }
  static async addTop3Buffs(app, html, data) {

    let actorId = data.actorId,
        actor = game.actors.get(actorId);
    if (data._id && game.actors.tokens[data._id] != null) {
      actorId = data._id;
      actor = game.actors.tokens[actorId];
    }

    if (actor == null)
      return;

    let quickActions = '<div class="col actions"><div class="above">'
    let items = actor.data.items.filter(o => (o.type === "buff") && getProperty(o, "data.active") === true).sort((a, b) => {      return a.data.sort - b.data.sort;
    });
    items.forEach(function(item) {
      const icon = item.img;
      let title = item.name;
      const type = item.type;
      quickActions += `<div id="${type}-${item._id}" class="control-icon token-quick-action"><img src="${icon}" width="36" height="36" title="${title}"></div>`;
    });

    html.find('.col.middle').after(quickActions + '</div></div>');

    items.forEach(function(item) {
      const type = item.type;
      html.find(`#${type}-${item._id}`).click(function(event) {
        game.D35E.rollItemMacro(item.name, {
          itemId: item._id,
          itemType: type,
          actorId: actorId
        });
      });
    });
  }
}
