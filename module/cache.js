export const CACHE = {};

CACHE.ClassFeatures = new Map()
CACHE.AllClassFeatures = []
CACHE.RacialFeatures = new Map()
CACHE.AllRacialFeatures = []
CACHE.AllAbilities = new Map()
CACHE.Materials = new Map()
CACHE.DamageTypes = new Map()

export const addClassAbilitiesFromPackToCache = async function(packName) {
    let itemPack = game.packs.get(packName);
    const entities = await itemPack.getContent();
    for (let e of entities) {
        //e.pack = packName;
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

}

export const addRacialAbilitiedFromPackToCache = async function (packName) {
    let itemPack = game.packs.get(packName);
    const entities = await itemPack.getContent();
    for (let e of entities) {
        //e.pack = packName;
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

}

export const rebuildCache = async function() {
    CACHE.ClassFeatures = new Map()
    CACHE.AllClassFeatures = []
    CACHE.RacialFeatures = new Map()
    CACHE.AllRacialFeatures = []
    CACHE.AllAbilities = new Map()
    CACHE.Materials = new Map()
    CACHE.DamageTypes = new Map()
    return buildCache();
}

export const buildCache = async function() {

    //console.log("D35E | Building Caches for compendiums...")
    ui.notifications.info(`Building Caches for compendiums...`);

    for (let packName of ["D35E.class-abilities", "world.class-abilities","LOTD.class-abilities","ETOOLS.class-abilities"])
    if (game.packs.has(packName)) {
        await addClassAbilitiesFromPackToCache(packName);
    }

    for (let packName of ["world.racial-abilities","LOTD.racial-abilities","D35E.racial-abilities"])
        if (game.packs.has(packName)) {
            await addRacialAbilitiedFromPackToCache(packName);
        }

    for (let packName of ["world.spelllike-abilities","world.spell-like-abilities","LOTD.spelllike","D35E.spelllike"])
        if (game.packs.has(packName)) {
            let itemPack = game.packs.get(packName);
            const entities = await itemPack.getContent();
            for (let e of entities) {
                //e.pack = packName;
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
        }


    for (let packName of ["world.materials","LOTD.materials","D35E.materials"])
        if (game.packs.has(packName)) {
            let itemPack = game.packs.get(packName);
            const entities = await itemPack.getContent();
            for (let e of entities) {
                //e.pack = packName;
                if (e.data.data.uniqueId) {
                    CACHE.Materials.set(e.data.data.uniqueId, e)
                }
            }
        }
    for (let packName of ["world.damage-types","LOTD.damage-types","D35E.damage-types"])
        if (game.packs.has(packName)) {
            let itemPack = game.packs.get(packName);
            const entities = await itemPack.getContent();
            for (let e of entities) {
                //e.pack = packName;
                if (e.data.data.uniqueId) {
                    CACHE.DamageTypes.set(e.data.data.uniqueId, e)
                }
            }
        }

    ui.notifications.info(`Building Caches for compendiums finished!`);
    //console.log("D35E | Building Caches for finished!")
}
