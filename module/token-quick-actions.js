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
    let items = actor.data.items.filter(o => o.type === "attack" && getProperty(o, "data.showInQuickbar") === true).sort((a, b) => {
      return a.data.sort - b.data.sort;
    });
    items.forEach(function(item) {
      if (item.type === "attack") {
        // const icon = "/systems/pf1/icons/actions/" + ( item.data.actionType === "mwak" ? "melee" : "ranged" ) + "-attack.svg"
        const icon = item.img;
        const title = game.i18n.localize("PF1.AttackWith").format(item.name)
        quickActions += '<div id="attack-' + item._id + '" class="control-icon token-quick-action"><img src="' + icon + '" width="36" height="36" title="' + title + '"></div>';
      }
    });
    
    html.find('.col.middle').after(quickActions + '</div></div>');
    
    items.forEach(function(item) {
      if (item.type === "attack") {
        html.find('#attack-' + item._id).click( function(event) {
          game.pf1.rollItemMacro(item.name, {
            itemId: item._id,
            itemType: "attack",
            actorId: actorId
          });
        });
      }
    });
  }
}
