export class TopPortraitBar {

  static async clear() {
    $('#portrait-bar').empty()
  }

  static async render(actor) {
    let partyHudType = game.settings.get("D35E", "showPartyHud")
    let useTokenImages = game.settings.get("D35E", "showPartyHudTokenImage")
    let portraitBar = $('#portrait-bar')
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    if (partyHudType === "none") {
      portraitBar.hide()
    }
    if (portraitBar.length === 0) {
      var $portraitBarDiv = $( "<div id='portrait-bar' class='portrait-bar flexcol'></div>" )
      $('#navigation').append($portraitBarDiv)
      var $portraitBarHandle = $("<div id='portrait-bar-handle'><a><i class='fas fa-arrows-alt'></i></a></div>")
      $portraitBarDiv.append($portraitBarHandle)
      //console.log($portraitBarHandle)
      $portraitBarHandle.on({
        mousedown:function(e)
        {
          //console.log('S')
          dragging = true;
          dragX = e.clientX - $(this).parent().position().left;
          dragY = e.clientY - $(this).parent().position().top;
        },
        mouseup:function(e){
          dragging = false;
          localStorage.setItem("D35E-portraitbar-y-location",$(this).parent().position().top)
          localStorage.setItem("D35E-portraitbar-x-location",$(this).parent().position().left)
          },
        mousemove:function(e)
        {
          //console.log('D')
          if(dragging)
            $(this).parent().offset({top:e.clientY-dragY,left:e.clientX-dragX});

        }
      })
    }
    let height = $('#scene-list').height()
    portraitBar = $('#portrait-bar')
    // //console.log('Bar', portraitBar, actor)
    if (actor == null)
      return;
    // if (actor.data.type !== "character")
    //   return;
    if (!actor.data.data.isPartyMember)
      return;
    if (!actor.testUserPermission(game.user, "LIMITED")) // Player cannot see
      return;

    if (portraitBar.find('#actor-portrait-'+actor.id).length === 0) {
      var $portraitDiv = $( "<div id='actor-portrait-"+actor.id+"' class='portrait "+partyHudType+"''><div class='barbox "+partyHudType+"'><span class='name'>"+actor.name+"</span> <div class='damagebar'><div class='background'></div> <div class='damage'></div><span class='life'>10/10</span></div></div><div class='buffbox flexrow "+partyHudType+"'></div><img src='"+(useTokenImages ? (actor.data?.token?.img || actor.img) : actor.img)+"'><div class='overlay'></div></div>" )
      portraitBar.append($portraitDiv)
    }


    let posTop = localStorage.getItem("D35E-portraitbar-y-location") || 460
    let postLeft = localStorage.getItem("D35E-portraitbar-x-location") || 20


    portraitBar.css('top',`${posTop}px`)
    portraitBar.css('left',`${postLeft}px`)
    let portraitDiv = portraitBar.find('#actor-portrait-'+actor.id);
    let buffBar = portraitDiv.find('.buffbox');
    buffBar.empty()
    // let quickActions = '<div class="col actions"><div class="above">'
    let items = actor.data.items.filter(o => (o.type === "buff") && getProperty(o.data, "data.active") === true).sort((a, b) => {      return a.data.sort - b.data.sort;
    });
    let damage = portraitDiv.find('.damage');
    let life = portraitDiv.find('.life');
    let pixelDamage = (actor.data.data.attributes.hp.value / actor.data.data.attributes.hp.max) * 100

      if (actor.data.data.attributes.hp.value <= -10) {
        pixelDamage = 0;
        portraitDiv.addClass('dead');
        life.text(`Dead`)
      } 
      //Dead is at -10 Hit Points or Lower
      else if (actor.data.data.attributes.hp.value < 0) {
        pixelDamage = 0;
        portraitDiv.addClass('dead');
        life.text(`Dying`)
      } else {
        portraitDiv.removeClass('dead');
        if (actor.testUserPermission(game.user, "OBSERVER")) {
          life.text(`${actor.data.data.attributes.hp.value} / ${actor.data.data.attributes.hp.max}`)
        } else {
          life.text(``)
        }
      }
      damage.css("width", `${pixelDamage}%`)

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
      buffBarItems += `<div class="item-image tooltip" style="background-image: url('${item.img}')"><div class="tooltipcontent">${title}</div><div class="pretty-border"></div></div>`;
    });

    buffBar.append(buffBarItems);


    //html.find('.col.middle').after(quickActions + '</div></div>');

    portraitDiv.click(function(event) {
      if (!actor.testUserPermission(game.user, "OBSERVER")) // Player cannot see
        return;
      actor.sheet.render(true);
    });
  }
}
