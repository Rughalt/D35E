import {CACHE} from "./cache.js";

export class DamageTypes {

    static get defaultDR() {
        return {
            uid: null,
            value: 0
        }
    }

    static getDamageTypeForUID(damageTypes, uid) {
        return damageTypes.find(dt => dt.uid === uid);
    }

    static getBaseDRDamageTypes() {
        let damageTypes = [
            {uid: 'any', name: game.i18n.localize("D35E.DRNonPenetrable"), value: 0, immunity: false},
            {uid: 'good', name: game.i18n.localize("D35E.AlignmentGood"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'evil', name: game.i18n.localize("D35E.AlignmentEvil"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'chaotic', name: game.i18n.localize("D35E.AlignmentChaotic"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'lawful', name: game.i18n.localize("D35E.AlignmentLawful"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'slashing', name: game.i18n.localize("D35E.DRSlashing"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'bludgeoning', name: game.i18n.localize("D35E.DRBludgeoning"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'piercing', name: game.i18n.localize("D35E.DRPiercing"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'epic', name: game.i18n.localize("D35E.DREpic"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'magic', name: game.i18n.localize("D35E.DRMagic"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'silver', name: game.i18n.localize("D35E.DRSilver"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'adamantine', name: game.i18n.localize("D35E.DRAdamantine"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'coldiron', name: game.i18n.localize("D35E.DRColdIron"), value: 0, or: false, lethal: false, immunity: false},
            {uid: 'incorporeal', name: game.i18n.localize("D35E.Incorporeal"), value: 0, or: false, lethal: false, immunity: false}]
        return damageTypes;
    }

    static getDRDamageTypes() {
        let damageTypes = DamageTypes.getBaseDRDamageTypes();
        return damageTypes;
    }

    static getDRForActor(actor, base = false) {
        let damageTypes = duplicate(this.getDRDamageTypes());
        let actorData = actor.data.data;
        let actorDR = base ? actorData.damageReduction : actorData.combinedDR
        DamageTypes.getDamageTypeForUID(damageTypes,'any').value = actorDR?.any || 0;
        (actorDR?.types || []).forEach(t => {
            if (t.uid === null) return ;
            let type = DamageTypes.getDamageTypeForUID(damageTypes,t.uid);
            type.value = t.value;
            type.or = t.or;
            type.lethal = t.lethal;
            type.immunity = t.immunity;
            type.modified = t.modified;
            type.items = t.items;
        })
        return damageTypes;
    }

    /**
     * This creates map in format that is used by the actor template
     * @param dr data resistances in format provided by this class
     * @returns {{}} map in correct format to be persisted in actor
     */
    static getActorMapForDR(dr) {
        let damageReduction = {}
        damageReduction['any'] = DamageTypes.getDamageTypeForUID(dr,'any').value;
        damageReduction['types'] = []
        dr.forEach(t => {
            if (t.uid === "any") return;
            damageReduction['types'].push(DamageTypes.getDamageTypeForUID(dr,t.uid));
        })
        return damageReduction;
    }

    static computeDRString(dr) {
        let or = game.i18n.localize("D35E.or")
        let and = game.i18n.localize("D35E.and")
        let DR = game.i18n.localize("D35E.DR")
        let lethal = game.i18n.localize("D35E.LethalDamageFrom")
        let immune = game.i18n.localize("D35E.Immunity")
        let drParts = [];
        let drOrParts = [];
        let orValue = 0;
        if (DamageTypes.getDamageTypeForUID(dr,'any').value > 0) {
            drParts.push(`${DR} ${DamageTypes.getDamageTypeForUID(dr,'any').value}/-`)
        }
        dr.forEach(t => {
            if (t.uid === "any") return;
            let drType = DamageTypes.getDamageTypeForUID(dr,t.uid)
            if (drType.immunity) {
                if (drType.or) {
                    drOrParts.push(`${drType.name}`)
                    orValue = immune;
                } else {
                    drParts.push(`${DR} ${immune}/${drType.name}`)
                }
            }
            else if (drType.value > 0) {
                if (drType.or) {
                    drOrParts.push(`${drType.name}`)
                    orValue = drType.value
                } else {
                    drParts.push(`${DR} ${drType.value}/${drType.name}`)
                }
            }
            if (drType.lethal) {
                drParts.push(`${lethal} ${drType.name}`)
            }
        })
        if (drOrParts.length)
            drParts.push(`${DR} ${orValue}/${drOrParts.join(` ${or} `)}`)

        return drParts.join('; ')
    }

    static computeDRTags(dr) {
        let or = game.i18n.localize("D35E.or")
        let and = game.i18n.localize("D35E.and")
        let DR = game.i18n.localize("D35E.DR")
        let lethal = game.i18n.localize("D35E.LethalDamageFrom")
        let immune = game.i18n.localize("D35E.Immunity")
        let drParts = [];
        drParts.push('<ul class="traits-list">')
        let drOrParts = [];
        let orValue = 0;
        if (DamageTypes.getDamageTypeForUID(dr,'any').value > 0) {
            drParts.push(`<li class="tag">${DR} ${DamageTypes.getDamageTypeForUID(dr,'any').value}/-</li>`)
        }
        let drOrModified = false;
        dr.forEach(t => {
            if (t.uid === "any") return;
            let drType = DamageTypes.getDamageTypeForUID(dr,t.uid)
            if (drType.immunity) {
                if (drType.or) {
                    drOrParts.push(`${drType.name}`)
                    orValue = immune;
                    drOrModified = drOrModified || t.modified;
                } else {
                    drParts.push(`<li class="tag ${t.modified ? 'modified' : ''}">${DR} ${immune}/${drType.name}</li>`)
                }
            }
            else if (drType.value > 0) {
                if (drType.or) {
                    drOrParts.push(`${drType.name}`)
                    orValue = drType.value
                    drOrModified = drOrModified || t.modified;
                } else {
                    drParts.push(`<li class="tag ${t.modified ? 'modified' : ''}">${DR} ${drType.value}/${drType.name}</li>`)
                }
            }
            if (drType.lethal) {
                drParts.push(`<li class="tag ${t.modified ? 'modified' : ''}">${lethal} ${drType.name}</li>`)
            }
        })
        if (drOrParts.length)
            drParts.push(`<li class="tag ${drOrModified ? 'modified' : ''}">${DR} ${orValue}/${drOrParts.join(` ${or} `)}</li>`)
        drParts.push('</ul>')
        return drParts.join('')
    }

    /**
     * Energy resistance part
     */

    static get defaultER() {
        return {
            uid: null,
            value: 0,
            vulnerable: false,
            immunity: false,
            lethal: false
        }
    }

    static getERDamageTypes() {
        let energyTypes = [];
        for(let damageType of CACHE.DamageTypes.values()) {
            if (damageType.data.data.damageType === "energy") {
                let energyType = {
                        uid: damageType.data.data.uniqueId,
                        name: damageType.data.name,
                        value: 0,
                        vulnerable: false,
                        immunity: false,
                        lethal: false
                    }
                    energyTypes.push(energyType)
            }
        }
        return energyTypes;
    }

    static getERForActor(actor, base = false) {
        let damageTypes = duplicate(this.getERDamageTypes());
        let actorData = actor.data.data;
        ((base ? actorData.energyResistance : actorData.combinedResistances) || []).forEach(t => {
            if (t.uid === null) return ;
            let type = DamageTypes.getDamageTypeForUID(damageTypes,t.uid);
            type.value = t.value;
            type.vulnerable = t.vulnerable;
            type.immunity = t.immunity;
            type.lethal = t.lethal;
            type.half = t.half;
            type.modified = t.modified;
            type.items = t.items;
        })
        return damageTypes;
    }

    static getActorMapForER(er) {
        let energyResistance = []
        er.forEach(t => {
            if (t.uid === "any") return;
            energyResistance.push(DamageTypes.getDamageTypeForUID(er,t.uid));
        })
        return energyResistance;
    }

    static computeERString(er) {
        let erParts = [];
        er.forEach(e => {
            if (e?.vulnerable) {
                erParts.push(`${e.name} ${game.i18n.localize("D35E.Vulnerability")}`)
            } else if (e?.immunity) {
                erParts.push(`${e.name} ${game.i18n.localize("D35E.Immunity")}`)
            } else if (e?.half) {
                erParts.push(`${e.name} ${game.i18n.localize("D35E.Half")}`)
            } else if (e?.lethal) {
                erParts.push(`${game.i18n.localize("D35E.LethalDamageFrom")} ${e.name}`)
            } else if (e.value > 0) {
                erParts.push(`${e.name} ${e.value}`)
            }
        });
        return erParts.join('; ')
    }

    static computeERTags(er) {
        let erParts = [];
        erParts.push('<ul class="traits-list">')
        er.forEach(e => {
            if (e?.vulnerable) {
                erParts.push(`<li class="tag ${e.modified ? 'modified' : ''}">${e.name} ${game.i18n.localize("D35E.Vulnerability")}</li>`)
            } else if (e?.immunity) {
                erParts.push(`<li class="tag ${e.modified ? 'modified' : ''}">${e.name} ${game.i18n.localize("D35E.Immunity")}</li>`)
            } else if (e?.half) {
                erParts.push(`<li class="tag ${e.modified ? 'modified' : ''}">${e.name} ${game.i18n.localize("D35E.Half")}</li>`)
            } else if (e?.lethal) {
                erParts.push(`<li class="tag ${e.modified ? 'modified' : ''}">${game.i18n.localize("D35E.LethalDamageFrom")} ${e.name}</li>`)
            } else if (e.value > 0) {
                erParts.push(`<li class="tag ${e.modified ? 'modified' : ''}">${e.name} ${e.value}</li>`)
            }
        });
        erParts.push('</ul>')
        return erParts.join('')
    }

    /**
     * Damage Calculation
     */
    static calculateDamageToActor(actor,damage,material,alignment,enh,nonLethal,noPrecision,incorporeal,applyHalf) {
        let er = DamageTypes.getERForActor(actor).filter(d => d.value > 0 || d.vulnerable || d.immunity || d.lethal);
        let dr = DamageTypes.getDRForActor(actor).filter(d => d.value > 0 || d.lethal || d.immunity);
        let hasRegeneration = !!actor.data.data.traits.regen;
        let nonLethalDamage = 0;
        let bypassedDr = new Set()
        if (enh > 0)
            bypassedDr.add("magic");
        if (enh > 5)
            bypassedDr.add("epic");
        if (alignment?.good)
            bypassedDr.add("good");
        if (alignment?.evil)
            bypassedDr.add("evil");
        if (alignment?.lawful)
            bypassedDr.add("lawful");
        if (alignment?.chaotic)
            bypassedDr.add("chaotic");
        if (incorporeal)
            bypassedDr.add("incorporeal");
        if (material?.data?.isAdamantineEquivalent)
            bypassedDr.add("adamantine");
        if (material?.data?.isAlchemicalSilverEquivalent)
            bypassedDr.add("silver");
        if (material?.data?.isColdIronEquivalent)
            bypassedDr.add("coldiron");
        let damageBeforeDr = 0;

        //Checks for slashing/piercing/bludgeonign damage and typeless damage
        let hasAnyTypeDamage = false;
        let baseIsNonLethal = nonLethal || false;
        damage.forEach(d => {
            if (d.damageTypeUid) {
                let _damage = CACHE.DamageTypes.get(d.damageTypeUid)
                if (_damage.data.data.damageType === "type") {
                    if (noPrecision && d.damageTypeUid === "damage-precision")
                        return; // We drop out if we do not apply precision damage
                    if (_damage.data.data.isPiercing)
                        bypassedDr.add("piercing");
                    if (_damage.data.data.isSlashing)
                        bypassedDr.add("slashing");
                    if (_damage.data.data.isBludgeoning)
                        bypassedDr.add("bludgeoning");
                    damageBeforeDr += d.roll.total;
                    hasAnyTypeDamage = true;
                    if (d.damageTypeUid === "damage-nonlethal"){
                        baseIsNonLethal = true;
                    }
                }
            } else {
                damageBeforeDr += d.roll.total;
                hasAnyTypeDamage = true;
            }
        })
        if (hasAnyTypeDamage)
            damageBeforeDr = Math.max(1,damageBeforeDr) // This makes base damage minimum 1
        let filteredDr = dr.filter(d => bypassedDr.has(d.uid))
        let lethalDr = dr.filter(d => d.lethal)
        let hasLethalDr = dr.some(d => bypassedDr.has(d.uid))
        if (hasRegeneration && !hasLethalDr)
            baseIsNonLethal = true;
        let hasOrInFiltered = filteredDr.some(d => d.or);
        let finalDr = dr.filter(d => !bypassedDr.has(d.uid))
        if (hasOrInFiltered) {
            finalDr = finalDr.filter(d => !d.or)
        }
        let highestDr = 0;
        let appliedDr = null
        finalDr.forEach(d => {if (d.immunity || d.value > highestDr) {
            highestDr = d.immunity ? 65536 : d.value ;
            appliedDr = d;
        }});
        let damageAfterDr = Math.max(damageBeforeDr - highestDr,0);
        if (baseIsNonLethal) {
            nonLethalDamage += damageAfterDr;
            damageAfterDr = 0;
        }
        let energyDamageAfterEr = 0
        let energyDamageBeforeEr = 0
        let energyDamage = []

        damage.forEach(d => {
            if (d.damageTypeUid) {
                let _damage = CACHE.DamageTypes.get(d.damageTypeUid)
                if (_damage.data.data.damageType === "energy") {
                    let erValue = DamageTypes.getDamageTypeForUID(er,d.damageTypeUid)
                    let realDamage = (applyHalf ? Math.floor(d.roll.total/2.0) : d.roll.total);
                    let damageAfterEr = Math.max(realDamage - (erValue?.value || 0),0)

                    if (d.damageTypeUid === 'damage-healing')
                        damageAfterEr =- damageAfterEr;
                    else if (actor.data.data.attributes?.creatureType === "undead" && d.damageTypeUid === "energy-negative")
                        damageAfterEr =- damageAfterEr;
                    else if (actor.data.data.attributes?.creatureType !== "undead" && d.damageTypeUid === "energy-positive")
                        damageAfterEr =- damageAfterEr;

                    let value = erValue?.value
                    if (erValue?.immunity) {
                        damageAfterEr = 0;
                        value = game.i18n.localize("D35E.Immunity")
                    }
                    else if (hasRegeneration && !erValue?.lethal) {
                        if (damageAfterEr > 0) {
                            nonLethalDamage += damageAfterEr;
                            damageAfterEr = 0;
                            value = game.i18n.localize("D35E.WeaponPropNonLethal")
                        }
                    }
                    else if (erValue?.vulnerable) {
                        damageAfterEr = Math.ceil(realDamage * 1.5)
                        value = game.i18n.localize("D35E.Vulnerability")
                    } else if (erValue?.half) {
                        damageAfterEr = Math.ceil(damageAfterEr * 0.5)
                        value = game.i18n.localize("D35E.Half")
                    } else if (damageAfterEr === realDamage) {
                        value = game.i18n.localize("D35E.NoER")
                    }
                    energyDamage.push({nonLethal: hasRegeneration && !erValue?.lethal,name:_damage.data.name,uid:_damage.data.data.uniqueId,before:d.roll.total,after:damageAfterEr,value:value || 0,lower:damageAfterEr<d.roll.total,higher:damageAfterEr>d.roll.total,equal:d.roll.total===damageAfterEr});
                    energyDamageAfterEr += damageAfterEr;
                    energyDamageBeforeEr += d.roll.total;

                    if (d.damageTypeUid === "energy-positive" || d.damageTypeUid === "energy-negative" || d.damageTypeUid === "energy-force") {
                        incorporeal = true; //These energy damages always are treated as incorporeal
                    }
                }
            }
        })



        let beforeDamage = damageBeforeDr + energyDamageBeforeEr;
        let afterDamage = energyDamageAfterEr + damageAfterDr;
        let incorporealMiss = false;
        if (actor.data.data.traits.incorporeal && !incorporeal) {
            if (Math.random() >= 0.5 || enh < 1){
                afterDamage = 0;
                energyDamageAfterEr = 0;
                damageAfterDr = 0;
                nonLethalDamage = 0;
                incorporealMiss = true;
            }
        }
        return {
            beforeDamage: beforeDamage,
            damage: afterDamage,
            baseIsNonLethal: baseIsNonLethal,
            nonLethalDamage: nonLethalDamage,
            displayDamage: Math.abs(afterDamage),
            isHealing: afterDamage < 0,
            baseBeforeDR: damageBeforeDr,
            baseAfterDR: damageAfterDr,
            energyDamageBeforeEr: energyDamageBeforeEr,
            energyDamageAfterEr: energyDamageAfterEr,
            lower:afterDamage<beforeDamage,
            higher:afterDamage>beforeDamage,
            equal:afterDamage===beforeDamage,
            appliedDR: appliedDr,
            energyDamage: energyDamage,
            incorporealMiss: incorporealMiss};
    }
}
