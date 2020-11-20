export const CACHE = {};

CACHE.ClassFeatures = new Map()
CACHE.AllClassFeatures = new Array()
CACHE.RacialFeatures = new Map()
CACHE.AllRacialFeatures = new Array()
CACHE.AllAbilities = new Map()

export const buildCache = async function() {

    console.log("D35E | Building Caches for compendiums...")
    ui.notifications.info(`Building Caches for compendiums...`);
    let itemPack = game.packs.get();
    let items = []
    for (let packName of ["D35E.class-abilities", "world.class-abilities","LOTD.class-abilities","ETOOLS.class-abilities"])
    if (game.packs.has(packName)) {
        itemPack = game.packs.get(packName);
        items = [];
        await itemPack.getIndex().then(index => items = index);
        for (let entry of items) {
            await itemPack.getEntity(entry._id).then(e => {
                    e.pack = packName;
                    if (e.data.data.associations !== undefined && e.data.data.associations.classes !== undefined) {
                        e.data.data.associations.classes.forEach(cl => {
                            if (!CACHE.ClassFeatures.has(cl[0]))
                                CACHE.ClassFeatures.set(cl[0], [])
                            CACHE.ClassFeatures.get(cl[0]).push(e)
                        })
                    }
                    if (e.data.data.uniqueId) {
                        CACHE.AllAbilities.set(e.data.data.uniqueId, e)
                        CACHE.AllClassFeatures.push(e);
                    }
                }
            )
        }
    }

    for (let packName of ["world.racial-abilities","LOTD.racial-abilities","D35E.racial-abilities"])
        if (game.packs.has(packName)) {
            itemPack = game.packs.get(packName);
            items = [];
            await itemPack.getIndex().then(index => items = index);
            for (let entry of items) {
                await itemPack.getEntity(entry._id).then(e => {
                    e.pack = packName;
                        if (e.data.data.tags !== undefined) {
                            e.data.data.tags.forEach(cl => {
                                if (!CACHE.RacialFeatures.has(cl[0]))
                                    CACHE.RacialFeatures.set(cl[0], [])
                                CACHE.RacialFeatures.get(cl[0]).push(e)
                            })
                        }
                    if (e.data.data.uniqueId) {
                        CACHE.AllAbilities.set(e.data.data.uniqueId, e)
                        CACHE.AllRacialFeatures.push(e);
                    }
                    }
                )
            }
        }


    ui.notifications.info(`Building Caches for compendiums finished!`);
    console.log("D35E | Building Caches for finished!")
}