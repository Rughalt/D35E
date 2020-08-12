export class TopPortraitBar {

  static async clear() {
    $('#portrait-bar').empty()
  }

  static async render(actor) {
    let partyHudType = game.settings.get("D35E", "showPartyHud")
    let portraitBar = $('#portrait-bar')
    if (partyHudType === "none") {
      portraitBar.hide()
    }
    if (portraitBar.length === 0) {
      var $portraitBarDiv = $( "<div id='portrait-bar' class='portrait-bar flexcol'></div>" )
      $('#navigation').append($portraitBarDiv)
    }
    let height = $('#scene-list').height()
    portraitBar = $('#portrait-bar')
    // console.log('Bar', portraitBar, actor)
    if (actor == null)
      return;
    if (actor.data.type !== "character")
      return;
    if (!actor.data.data.isPartyMember)
      return;
    if (!actor.hasPerm(game.user, "OBSERVER")) // Player cannot see
      return;

    if (portraitBar.find('#actor-portrait-'+actor.id).length === 0) {
      var $portraitDiv = $( "<div id='actor-portrait-"+actor.id+"' class='portrait "+partyHudType+"''><div class='barbox "+partyHudType+"'><span class='name'>"+actor.name+"</span> <div class='damagebar'><div class='background'></div> <div class='damage'></div><span class='life'>10/10</span></div></div><div class='buffbox flexrow "+partyHudType+"'></div><img src='"+actor.img+"'><div class='overlay'></div></div>" )
      portraitBar.append($portraitDiv)
    }
    portraitBar.css('top','460px')
    portraitBar.css('left','20px')
    let portraitDiv = portraitBar.find('#actor-portrait-'+actor.id);
    let buffBar = portraitDiv.find('.buffbox');
    buffBar.empty()
    // let quickActions = '<div class="col actions"><div class="above">'
    let items = actor.data.items.filter(o => (o.type === "buff") && getProperty(o, "data.active") === true).sort((a, b) => {      return a.data.sort - b.data.sort;
    });
    let damage = portraitDiv.find('.damage');
    let life = portraitDiv.find('.life');
    let pixelDamage = (actor.data.data.attributes.hp.value / actor.data.data.attributes.hp.max) * 100
    if (actor.data.data.attributes.hp.value <= 0) {
      pixelDamage = 0;
      portraitDiv.addClass('dead');
      life.text(`Dead`)
    } else {
      portraitDiv.removeClass('dead');
      life.text(`${actor.data.data.attributes.hp.value} / ${actor.data.data.attributes.hp.max}`)
    }
    damage.css("width",`${pixelDamage}%`)
    //damage.css("top",`calc(100px - ${pixelDamage}px)`)
    //<div class="item-image tooltip" style="background-image: url('systems/D35E/icons/buffs/bark-skin.png')">
    //              <span class="tooltipcontent">
    //                   Barkskin
    //                 </span>
    //             </div>
    let buffBarItems = "";
    items.forEach(function(item) {
      const icon = item.img;
      let title = item.name;
      const type = item.type;
      buffBarItems += `<div class="item-image tooltip" style="background-image: url('${item.img}')"><div class="pretty-border"></div></div>`;
    });

    buffBar.append(buffBarItems);


    //html.find('.col.middle').after(quickActions + '</div></div>');

    portraitDiv.click(function(event) {
      if (!actor.hasPerm(game.user, "OBSERVER")) // Player cannot see
        return;
      actor.sheet.render(true);
    });
  }
}
