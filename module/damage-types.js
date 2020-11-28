import {CACHE} from "./cache.js";

export class DamageTypes {

    static getDamageTypeForUID(damageTypes, uid) {
        return damageTypes.find(dt => dt.uid === uid);
    }

    static getBaseDRDamageTypes() {
        let damageTypes = [
            {uid: 'any', name: game.i18n.localize("D35E.DRNonPenetrable"), value: 0},
            {uid: 'good', name: game.i18n.localize("D35E.AlignmentGood"), value: 0, or: false},
            {uid: 'evil', name: game.i18n.localize("D35E.AlignmentEvil"), value: 0, or: false},
            {uid: 'chaotic', name: game.i18n.localize("D35E.AlignmentChaotic"), value: 0, or: false},
            {uid: 'lawful', name: game.i18n.localize("D35E.AlignmentLawful"), value: 0, or: false},
            {uid: 'slashing', name: game.i18n.localize("D35E.DRSlashing"), value: 0, or: false},
            {uid: 'bludgeoning', name: game.i18n.localize("D35E.DRMagic"), value: 0, or: false},
            {uid: 'piercing', name: game.i18n.localize("D35E.DRPiercing"), value: 0, or: false},
            {uid: 'epic', name: game.i18n.localize("D35E.DREpic"), value: 0, or: false},
            {uid: 'magic', name: game.i18n.localize("D35E.DRMagic"), value: 0, or: false},
            {uid: 'silver', name: game.i18n.localize("D35E.DRSilver"), value: 0, or: false},
            {uid: 'adamantine', name: game.i18n.localize("D35E.DRAdamantine"), value: 0, or: false},
            {uid: 'coldiron', name: game.i18n.localize("D35E.DRColdIron"), value: 0, or: false}]
        return damageTypes;
    }

    static getDRDamageTypes() {
        let damageTypes = DamageTypes.getBaseDRDamageTypes();
        return damageTypes;
    }

    static getDRForActor(actor) {
        let damageTypes = duplicate(this.getDRDamageTypes());
        let actorData = actor.data.data;
        DamageTypes.getDamageTypeForUID(damageTypes,'any').value = actorData.damageReduction?.any || 0;
        (actorData.damageReduction?.types || []).forEach(t => {
            let type = DamageTypes.getDamageTypeForUID(damageTypes,t.uid);
            type.value = t.value;
            type.or = t.or;
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
        let drParts = [];
        let drOrParts = [];
        let orValue = 0;
        if (DamageTypes.getDamageTypeForUID(dr,'any').value > 0) {
            drParts.push(`${DR} ${DamageTypes.getDamageTypeForUID(dr,'any').value}/-`)
        }
        dr.forEach(t => {
            if (t.uid === "any") return;
            let drType = DamageTypes.getDamageTypeForUID(dr,t.uid)
            if (drType.value > 0) {
                if (drType.or) {
                    drOrParts.push(`${drType.name}`)
                    orValue = drType.value
                } else {
                    drParts.push(`${DR} ${drType.value}/${drType.name}`)
                }
            }
        })
        drParts.push(`${DR} ${orValue}/${drOrParts.join(` ${or} `)}`)
        return drParts.join('; ')
    }

    /**
     * Energy resistance part
     */
    static getERDamageTypes() {
        let energyTypes = [];
        for(let damageType of CACHE.DamageTypes.values()) {
            if (damageType.data.data.damageType === "energy") {
                let energyType = {
                        uid: damageType.data.data.uniqueId,
                        name: damageType.data.name,
                        value: 0,
                        vulnerable: false,
                        immunity: false
                    }
                    energyTypes.push(energyType)
            }
        }
        return energyTypes;
    }

    static getERForActor(actor) {
        let damageTypes = duplicate(this.getERDamageTypes());
        let actorData = actor.data.data;
        (actorData.energyResistance || []).forEach(t => {
            let type = DamageTypes.getDamageTypeForUID(damageTypes,t.uid);
            type.value = t.value;
            type.vulnerable = t.vulnerable;
            type.immunity = t.immunity;
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
}