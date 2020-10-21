export const CACHE = {};

CACHE.ClassFeatures = new Map()

export const buildCache = async function() {

    console.log("D35E | Building Caches for compendiums...")
    ui.notifications.info(`Building Caches for compendiums...`);
    let itemPack = game.packs.get("D35E.class-abilities");
    let items = []
    await itemPack.getIndex().then(index => items = index);
    for (let entry of items) {
        await itemPack.getEntity(entry._id).then(e => {
                if (e.data.data.associations !== undefined && e.data.data.associations.classes !== undefined) {
                    e.data.data.associations.classes.forEach(cl => {
                        if (!CACHE.ClassFeatures.has(cl[0]))
                            CACHE.ClassFeatures.set(cl[0],[])
                        CACHE.ClassFeatures.get(cl[0]).push(e)
                    })
                }
            }
        )
    }
    for (let packName of ["world.class-abilities","LOTD.class-abilities","ETOOLS.class-abilities"])
    if (game.packs.has(packName)) {
        itemPack = game.packs.get(packName);
        items = [];
        await itemPack.getIndex().then(index => items = index);
        for (let entry of items) {
            await itemPack.getEntity(entry._id).then(e => {
                    if (e.data.data.associations !== undefined && e.data.data.associations.classes !== undefined) {
                        e.data.data.associations.classes.forEach(cl => {
                            if (!CACHE.ClassFeatures.has(cl[0]))
                                CACHE.ClassFeatures.set(cl[0], [])
                            CACHE.ClassFeatures.get(cl[0]).push(e)
                        })
                    }
                }
            )
        }
    }

    ui.notifications.info(`Building Caches for compendiums finished!`);
    console.log("D35E | Building Caches for finished!")
}