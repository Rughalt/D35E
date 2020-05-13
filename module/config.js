// Namespace D&D5e Configuration Values
export const PF1 = {};

PF1.re = {
  "traitSeparator": /\s*[,;]\s*/g,
};


/**
 * The set of Ability Scores used within the system
 * @type {Object}
 */
PF1.abilities = {
  "str": "PF1.AbilityStr",
  "dex": "PF1.AbilityDex",
  "con": "PF1.AbilityCon",
  "int": "PF1.AbilityInt",
  "wis": "PF1.AbilityWis",
  "cha": "PF1.AbilityCha"
};

PF1.abilitiesShort = {
  "str": "PF1.AbilityShortStr",
  "dex": "PF1.AbilityShortDex",
  "con": "PF1.AbilityShortCon",
  "int": "PF1.AbilityShortInt",
  "wis": "PF1.AbilityShortWis",
  "cha": "PF1.AbilityShortCha"
};

/**
 * The set of Saving Throws
 * @type {Object}
 */
PF1.savingThrows = {
  "fort": "PF1.SavingThrowFort",
  "ref": "PF1.SavingThrowRef",
  "will": "PF1.SavingThrowWill"
};

/**
 * The set of modifiers for Saving Throws
 * @type {Object}
 */
PF1.savingThrowMods = {
  "fort": "con",
  "ref": "dex",
  "will": "wis"
};

PF1.classTypes = {
  "base": "PF1.ClassTypeBase",
  "prestige": "PF1.ClassTypePrestige",
  "racial": "PF1.ClassTypeRacial",
};

PF1.classBAB = {
  "low": "PF1.Low",
  "med": "PF1.Medium",
  "high": "PF1.High",
};

PF1.classSavingThrows = {
  "low": "PF1.Poor",
  "high": "PF1.Good",
};

PF1.classBABFormulas = {
  "low": "floor(@level * 0.5)",
  "med": "floor(@level * 0.75)",
  "high": "@level",
};

PF1.classSavingThrowFormulas = {
  "base": {
    "low": "floor(@level / 3)",
    "high": "2 + floor(@level / 2)",
  },
  "prestige": {
    "low": "floor((1 + @level) / 3)",
    "high": "floor((1 + @level) / 2)",
  },
  "racial": {
    "low": "floor(@level / 3)",
    "high": "2 + floor(@level / 2)",
  },
};

PF1.favouredClassBonuses = {
  "hp": "PF1.FavouredClassHP",
  "skill": "PF1.FavouredClassSkill",
  "alt": "PF1.FavouredClassAlt",
};

/**
 * The set of Armor Classes
 * @type {Object}
 */
PF1.ac = {
  "normal": "PF1.ACNormal",
  "touch": "PF1.ACTouch",
  "flatFooted": "PF1.ACFlatFooted"
};

/**
 * The set of Armor Class modifier types
 * @type {Object}
 */
PF1.acValueLabels = {
  "normal": "PF1.ACTypeNormal",
  "touch": "PF1.ACTypeTouch",
  "flatFooted": "PF1.ACTypeFlatFooted"
};

/* -------------------------------------------- */

/**
 * Character alignment options
 * @type {Object}
 */
PF1.alignments = {
  'lg': "PF1.AlignmentLG",
  'ng': "PF1.AlignmentNG",
  'cg': "PF1.AlignmentCG",
  'ln': "PF1.AlignmentLN",
  'tn': "PF1.AlignmentTN",
  'cn': "PF1.AlignmentCN",
  'le': "PF1.AlignmentLE",
  'ne': "PF1.AlignmentNE",
  'ce': "PF1.AlignmentCE"
};

/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have
 * @type {Object}
 */
PF1.armorProficiencies = {
  "lgt": "PF1.ArmorProfLight",
  "med": "PF1.ArmorProfMedium",
  "hvy": "PF1.ArmorProfHeavy",
  "shl": "PF1.ArmorProfShield",
  "twr": "PF1.ArmorProfTowerShield",
};

PF1.weaponProficiencies = {
  "sim": "PF1.WeaponProfSimple",
  "mar": "PF1.WeaponProfMartial",
};

/* -------------------------------------------- */

/**
 * This describes the ways that an ability can be activated
 * @type {Object}
 */
PF1.abilityActivationTypes = {
  "passive": "PF1.ActivationTypePassive",
  "free": "PF1.ActivationTypeFree",
  "swift": "PF1.ActivationTypeSwift",
  "immediate": "PF1.ActivationTypeImmediate",
  "move": "PF1.ActivationTypeMove",
  "standard": "PF1.ActivationTypeStandard",
  "full": "PF1.ActivationTypeFullround",
  "attack": "PF1.ActivationTypeAttack",
  "round": "PF1.ActivationTypeRound",
  "minute": "PF1.ActivationTypeMinute",
  "hour": "PF1.ActivationTypeHour",
  "special": "PF1.ActivationTypeSpecial",
};

/**
 * This describes plurals for activation types.
 */
PF1.abilityActivationTypesPlurals = {
  "free": "PF1.ActivationTypeFreePlural",
  "swift": "PF1.ActivationTypeSwiftPlural",
  "immediate": "PF1.ActivationTypeImmediatePlural",
  "move": "PF1.ActivationTypeMovePlural",
  "standard": "PF1.ActivationTypeStandardPlural",
  "full": "PF1.ActivationTypeFullroundPlural",
  "attack": "PF1.ActivationTypeAttackPlural",
  "round": "PF1.ActivationTypeRoundPlural",
  "minute": "PF1.ActivationTypeMinutePlural",
  "hour": "PF1.ActivationTypeHourPlural",
};

PF1.divineFocus = {
  "0": "",
  "1": "PF1.SpellComponentDivineFocusAlone",
  "2": "PF1.SpellComponentDivineFocusMaterial",
  "3": "PF1.SpellComponentDivineFocusFocus",
};

PF1.measureTemplateTypes = {
  "cone": "PF1.MeasureTemplateCone",
  "circle": "PF1.MeasureTemplateCircle",
  "ray": "PF1.MeasureTemplateRay",
};

/* -------------------------------------------- */

// Creature Sizes
PF1.actorSizes = {
  "fine": "PF1.ActorSizeFine",
  "dim": "PF1.ActorSizeDiminutive",
  "tiny": "PF1.ActorSizeTiny",
  "sm": "PF1.ActorSizeSmall",
  "med": "PF1.ActorSizeMedium",
  "lg": "PF1.ActorSizeLarge",
  "huge": "PF1.ActorSizeHuge",
  "grg": "PF1.ActorSizeGargantuan",
  "col": "PF1.ActorSizeColossal",
};

PF1.sizeChart = {
  "fine": "F",
  "dim":  "D",
  "tiny": "T",
  "sm":   "S",
  "med":  "M",
  "lg":   "L",
  "huge": "H",
  "grg":  "G",
  "col":  "C",
};

PF1.tokenSizes = {
  "fine": { w: 1, h: 1, scale: 0.2 },
  "dim": { w: 1, h: 1, scale: 0.4 },
  "tiny": { w: 1, h: 1, scale: 0.6 },
  "sm": { w: 1, h: 1, scale: 0.8 },
  "med": { w: 1, h: 1, scale: 1 },
  "lg": { w: 2, h: 2, scale: 1 },
  "huge": { w: 3, h: 3, scale: 1 },
  "grg": { w: 4, h: 4, scale: 1 },
  "col": { w: 6, h: 6, scale: 1 },
};

PF1.sizeMods = {
  "fine": 8,
  "dim": 4,
  "tiny": 2,
  "sm": 1,
  "med": 0,
  "lg": -1,
  "huge": -2,
  "grg": -4,
  "col": -8
};

PF1.sizeSpecialMods = {
  "fine": -8,
  "dim": -4,
  "tiny": -2,
  "sm": -1,
  "med": 0,
  "lg": 1,
  "huge": 2,
  "grg": 4,
  "col": 8
};

PF1.sizeFlyMods = {
  "fine": 8,
  "dim": 6,
  "tiny": 4,
  "sm": 2,
  "med": 0,
  "lg": -2,
  "huge": -4,
  "grg": -6,
  "col": -8
};

PF1.sizeStealthMods = {
  "fine": 16,
  "dim": 12,
  "tiny": 8,
  "sm": 4,
  "med": 0,
  "lg": -4,
  "huge": -8,
  "grg": -12,
  "col": -16
};

PF1.flyManeuverabilities = {
  "clumsy": "PF1.FlyManeuverabilityClumsy",
  "poor": "PF1.FlyManeuverabilityPoor",
  "average": "PF1.FlyManeuverabilityAverage",
  "good": "PF1.FlyManeuverabilityGood",
  "perfect": "PF1.FlyManeuverabilityPerfect",
};

PF1.flyManeuverabilityValues = {
  "clumsy": -8,
  "poor": -4,
  "average": 0,
  "good": 4,
  "perfect": 8,
};

PF1.speedReduction = {
  "5": 5,
  "15": 10,
  "20": 15,
  "30": 20,
  "35": 25,
  "45": 30,
  "50": 35,
  "60": 40,
  "65": 45,
  "75": 50,
  "80": 55,
  "90": 60,
  "95": 65,
  "105": 70,
  "110": 75,
  "120": 80,
};

/* -------------------------------------------- */

PF1.encumbranceLoads = [
  0,
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  115, 130, 150, 175, 200, 230, 260, 300, 350,
  400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400, 1600
];

PF1.encumbranceMultipliers = {
  normal: {
    fine: 0.125,
    dim: 0.25,
    tiny: 0.5,
    sm: 0.75,
    med: 1,
    lg: 2,
    huge: 4,
    grg: 8,
    col: 16,
  },
  quadruped: {
    fine: 0.25,
    dim: 0.5,
    tiny: 0.75,
    sm: 1,
    med: 1.5,
    lg: 3,
    huge: 6,
    grg: 12,
    col: 24,
  },
};

/* -------------------------------------------- */

/**
 * Classification types for item action types
 * @type {Object}
 */
PF1.itemActionTypes = {
  "mwak": "PF1.ActionMWAK",
  "rwak": "PF1.ActionRWAK",
  "msak": "PF1.ActionMSAK",
  "rsak": "PF1.ActionRSAK",
  "spellsave": "PF1.ActionSpellSave",
  "save": "PF1.ActionSave",
  "heal": "PF1.ActionHeal",
  "other": "PF1.ActionOther"
};

/* -------------------------------------------- */

PF1.itemCapacityTypes = {
  "items": "PF1.ItemContainerCapacityItems",
  "weight": "PF1.ItemContainerCapacityWeight"
};

/* -------------------------------------------- */

/**
 * Enumerate the lengths of time over which an item can have limited use ability
 * @type {Object}
 */
PF1.limitedUsePeriods = {
  "single": "PF1.LimitedUseSingle",
  "unlimited": "PF1.Unlimited",
  "day": "PF1.LimitedUseDay",
  "week": "PF1.LimitedUseWeek",
  "charges": "PF1.LimitedUseCharges",
};


/* -------------------------------------------- */

// Equipment Types
PF1.equipmentTypes = {
  "armor": {
    "_label": "PF1.EquipTypeArmor",
    "lightArmor": "PF1.EquipTypeLight",
    "mediumArmor": "PF1.EquipTypeMedium",
    "heavyArmor": "PF1.EquipTypeHeavy",
  },
  "shield": {
    "_label": "PF1.EquipTypeShield",
    "lightShield": "PF1.EquipTypeLightShield",
    "heavyShield": "PF1.EquipTypeHeavyShield",
    "towerShield": "PF1.EquipTypeTowerShield",
    "other": "PF1.EquipTypeOtherShield",
  },
  "misc": {
    "_label": "PF1.Misc",
    "wondrous": "PF1.EquipTypeWondrousItem",
    "clothing": "PF1.EquipTypeClothing",
    "other": "PF1.Other",
  },
};

PF1.equipmentSlots = {
  "armor": {
    "armor": "PF1.EquipSlotArmor",
  },
  "shield": {
    "shield": "PF1.EquipSlotShield",
  },
  "misc": {
    "slotless": "PF1.EquipSlotSlotless",
    "head": "PF1.EquipSlotHead",
    "headband": "PF1.EquipSlotHeadband",
    "eyes": "PF1.EquipSlotEyes",
    "shoulders": "PF1.EquipSlotShoulders",
    "neck": "PF1.EquipSlotNeck",
    "chest": "PF1.EquipSlotChest",
    "body": "PF1.EquipSlotBody",
    "belt": "PF1.EquipSlotBelt",
    "wrists": "PF1.EquipSlotWrists",
    "hands": "PF1.EquipSlotHands",
    "ring": "PF1.EquipSlotRing",
    "feet": "PF1.EquipSlotFeet",
  },
};

PF1.lootTypes = {
  "gear": "PF1.LootTypeGear",
  "ammo": "PF1.LootTypeAmmo",
  "tradeGoods": "PF1.LootTypeTradeGoods",
  "misc": "PF1.Misc",
};


/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system
 * @type {Object}
 */
PF1.consumableTypes = {
  "potion": "PF1.ConsumableTypePotion",
  "poison": "PF1.ConsumableTypePoison",
  "drug": "PF1.ConsumableTypeDrug",
  "scroll": "PF1.ConsumableTypeScroll",
  "wand": "PF1.ConsumableTypeWand",
  "misc": "PF1.Misc",
};

PF1.attackTypes = {
  "weapon": "PF1.AttackTypeWeapon",
  "natural": "PF1.AttackTypeNatural",
  "ability": "PF1.AttackTypeAbility",
  "racialAbility": "PF1.AttackTypeRacial",
  "misc": "PF1.Misc",
};

PF1.featTypes = {
  "feat": "PF1.FeatTypeFeat",
  "classFeat": "PF1.FeatTypeClassFeat",
  "trait": "PF1.FeatTypeTraits",
  "racial": "PF1.FeatTypeRacial",
  "misc": "PF1.Misc",
};

/* -------------------------------------------- */

/**
 * The valid currency denominations supported by the 5e system
 * @type {Object}
 */
PF1.currencies = {
  "pp": "PF1.CurrencyPP",
  "gp": "PF1.CurrencyGP",
  "sp": "PF1.CurrencySP",
  "cp": "PF1.CurrencyCP",
};

PF1.acTypes = {
  "armor": "Armor",
  "shield": "Shield",
  "natural": "Natural Armor",
};

PF1.bonusModifiers = {
  "untyped": "Untyped",
  "base": "Base",
  "enh": "Enhancement",
  "dodge": "Dodge",
  "inherent": "Inherent",
  "deflection": "Deflection",
  "morale": "Morale",
  "luck": "Luck",
  "sacred": "Sacred",
  "insight": "Insight",
  "resist": "Resistance",
  "profane": "Profane",
  "trait": "Trait",
  "racial": "Racial",
  "size": "Size",
  "competence": "Competence",
  "circumstance": "Circumstance",
  "alchemical": "Alchemical",
  "penalty": "Penalty",
};

/* -------------------------------------------- */


// Damage Types
PF1.damageTypes = {
  "bludgeoning": "Bludgeoning",
  "piercing": "Piercing",
  "slashing": "Slashing",
  "cold": "Cold",
  "fire": "Fire",
  "electric": "Electricity",
  "sonic": "Sonic",
  "acid": "Acid",
  "force": "Force",
  "negative": "Negative",
  "positive": "Positive",
};

/* -------------------------------------------- */

PF1.distanceUnits = {
  "none": "PF1.None",
  "personal": "PF1.DistPersonal",
  "touch": "PF1.DistTouch",
  "close": "PF1.DistClose",
  "medium": "PF1.DistMedium",
  "long": "PF1.DistLong",
  "ft": "PF1.DistFt",
  "mi": "PF1.DistMi",
  "spec": "PF1.Special",
  "seeText": "PF1.SeeText",
  "unlimited": "PF1.Unlimited",
};

/* -------------------------------------------- */

/**
 * This Object defines the types of single or area targets which can be applied in D&D5e
 * @type {Object}
 */
PF1.targetTypes = {
  "none": "PF1.None",
  "self": "PF1.TargetSelf",
  "creature": "PF1.TargetCreature",
  "ally": "PF1.TargetAlly",
  "enemy": "PF1.TargetEnemy",
  "object": "PF1.TargetObject",
  "space": "PF1.TargetSpace",
  "radius": "PF1.TargetRadius",
  "sphere": "PF1.TargetSphere",
  "cylinder": "PF1.TargetCylinder",
  "cone": "PF1.TargetCone",
  "square": "PF1.TargetSquare",
  "cube": "PF1.TargetCube",
  "line": "PF1.TargetLine",
  "wall": "PF1.TargetWall"
};

/* -------------------------------------------- */

/**
 * This Object defines the various lengths of time which can occur in PF1
 * @type {Object}
 */
PF1.timePeriods = {
  "inst": "PF1.TimeInst",
  "turn": "PF1.TimeTurn",
  "round": "PF1.TimeRound",
  "minute": "PF1.TimeMinute",
  "hour": "PF1.TimeHour",
  "day": "PF1.TimeDay",
  "month": "PF1.TimeMonth",
  "year": "PF1.TimeYear",
  "perm": "PF1.TimePerm",
  "seeText": "PF1.SeeText",
  "spec": "PF1.Special",
};

/* -------------------------------------------- */

// Healing Types
PF1.healingTypes = {
  "healing": "PF1.Healing",
  "temphp": "PF1.HealingTemp"
};

/* -------------------------------------------- */

/**
 * Character senses options
 * @type {Object}
 */
PF1.senses = {
  "bs": "PF1.SenseBS",
  "dv": "PF1.SenseDV",
  "ts": "PF1.SenseTS",
  "tr": "PF1.SenseTR",
  "ll": "PF1.SenseLL"
};


/* -------------------------------------------- */

/**
 * The set of skill which can be trained in PF1
 * @type {Object}
 */
PF1.skills = {
  "acr": "PF1.SkillAcr",
  "apr": "PF1.SkillApr",
  "art": "PF1.SkillArt",
  "blf": "PF1.SkillBlf",
  "clm": "PF1.SkillClm",
  "crf": "PF1.SkillCrf",
  "dip": "PF1.SkillDip",
  "dev": "PF1.SkillDev",
  "dis": "PF1.SkillDis",
  "esc": "PF1.SkillEsc",
  "fly": "PF1.SkillFly",
  "han": "PF1.SkillHan",
  "hea": "PF1.SkillHea",
  "int": "PF1.SkillInt",
  "kar": "PF1.SkillKAr",
  "kdu": "PF1.SkillKDu",
  "ken": "PF1.SkillKEn",
  "kge": "PF1.SkillKGe",
  "khi": "PF1.SkillKHi",
  "klo": "PF1.SkillKLo",
  "kna": "PF1.SkillKNa",
  "kno": "PF1.SkillKNo",
  "kpl": "PF1.SkillKPl",
  "kre": "PF1.SkillKRe",
  "lin": "PF1.SkillLin",
  "lor": "PF1.SkillLor",
  "per": "PF1.SkillPer",
  "prf": "PF1.SkillPrf",
  "pro": "PF1.SkillPro",
  "rid": "PF1.SkillRid",
  "sen": "PF1.SkillSen",
  "slt": "PF1.SkillSlt",
  "spl": "PF1.SkillSpl",
  "ste": "PF1.SkillSte",
  "sur": "PF1.SkillSur",
  "swm": "PF1.SkillSwm",
  "umd": "PF1.SkillUMD"
};

PF1.arbitrarySkills = [
  "art", "crf", "lor", "prf", "pro"
];


/* -------------------------------------------- */

PF1.spellPreparationModes = {
  "atwill": "PF1.SpellPrepAtWill",
  "prepared": "PF1.SpellPrepPrepared",
  "spontaneous": "PF1.SpellPrepSpontaneous",
};

/* -------------------------------------------- */

/* -------------------------------------------- */

// Weapon Types
PF1.weaponTypes = {
  "simple": {
    "_label": "PF1.WeaponTypeSimple",
    "light": "PF1.WeaponPropLight",
    "1h": "PF1.WeaponPropOneHanded",
    "2h": "PF1.WeaponPropTwoHanded",
    "ranged": "PF1.WeaponSubtypeRanged",
  },
  "martial": {
    "_label": "PF1.WeaponTypeMartial",
    "light": "PF1.WeaponPropLight",
    "1h": "PF1.WeaponPropOneHanded",
    "2h": "PF1.WeaponPropTwoHanded",
    "ranged": "PF1.WeaponSubtypeRanged",
  },
  "exotic": {
    "_label": "PF1.WeaponTypeExotic",
    "light": "PF1.WeaponPropLight",
    "1h": "PF1.WeaponPropOneHanded",
    "2h": "PF1.WeaponPropTwoHanded",
    "ranged": "PF1.WeaponSubtypeRanged",
  },
  "misc": {
    "_label": "PF1.Misc",
    "splash": "PF1.WeaponTypeSplash",
    "other": "PF1.Other",
  }
};


/* -------------------------------------------- */

/**
 * Define the set of weapon property flags which can exist on a weapon
 * @type {Object}
 */
PF1.weaponProperties = {
  "blc": "PF1.WeaponPropBlocking",
  "brc": "PF1.WeaponPropBrace",
  "dbl": "PF1.WeaponPropDouble",
  "dis": "PF1.WeaponPropDisarm",
  "fin": "PF1.WeaponPropFinesse",
  "frg": "PF1.WeaponPropFragile",
  "grp": "PF1.WeaponPropGrapple",
  "imp": "PF1.WeaponPropImprovised",
  "mnk": "PF1.WeaponPropMonk",
  "nnl": "PF1.WeaponPropNonLethal",
  "prf": "PF1.WeaponPropPerformance",
  "rch": "PF1.WeaponPropReach",
  "snd": "PF1.WeaponPropSunder",
  "thr": "PF1.WeaponPropThrown",
  "trp": "PF1.WeaponPropTrip",
};


// Spell Components
PF1.spellComponents = {
  "V": "PF1.SpellComponentVerbal",
  "S": "PF1.SpellComponentSomatic",
  "M": "PF1.SpellComponentMaterial",
  "F": "PF1.SpellComponentFocus",
  "DF": "PF1.SpellComponentDivineFocus",
};

// Spell Schools
PF1.spellSchools = {
  "abj": "PF1.SpellSchoolAbjuration",
  "con": "PF1.SpellSchoolConjuration",
  "div": "PF1.SpellSchoolDivination",
  "enc": "PF1.SpellSchoolEnchantment",
  "evo": "PF1.SpellSchoolEvocation",
  "ill": "PF1.SpellSchoolIllusion",
  "nec": "PF1.SpellSchoolNecromancy",
  "trs": "PF1.SpellSchoolTransmutation",
  "uni": "PF1.SpellSchoolUniversal",
  "misc": "PF1.Misc",
};

// Spell Levels
PF1.spellLevels = {
  0: "PF1.SpellLevel0",
  1: "PF1.SpellLevel1",
  2: "PF1.SpellLevel2",
  3: "PF1.SpellLevel3",
  4: "PF1.SpellLevel4",
  5: "PF1.SpellLevel5",
  6: "PF1.SpellLevel6",
  7: "PF1.SpellLevel7",
  8: "PF1.SpellLevel8",
  9: "PF1.SpellLevel9",
};

/* -------------------------------------------- */

/**
 * Weapon proficiency levels
 * Each level provides a proficiency multiplier
 * @type {Object}
 */
PF1.proficiencyLevels = {
  "-4": "Not Proficient",
  0: "Proficient"
};

/* -------------------------------------------- */

PF1.conditionTypes = {
  "bleed": "PF1.CondTypeBleed",
  "blind": "PF1.CondTypeBlind",
  "confuse": "PF1.CondTypeConfuse",
  "daze": "PF1.CondTypeDaze",
  "dazzle": "PF1.CondTypeDazzle",
  "deaf": "PF1.CondTypeDeaf",
  "disease": "PF1.CondTypeDisease",
  "energyDrain": "PF1.CondTypeEnergyDrain",
  "fatigue": "PF1.CondTypeFatigue",
  "fear": "PF1.CondTypeFear",
  "mindAffecting": "PF1.CondTypeMindAffecting",
  "poison": "PF1.CondTypePoison",
  "sicken": "PF1.CondTypeSicken",
  "paralyze": "PF1.CondTypeParalyze",
  "petrify": "PF1.CondTypePetrify",
  "stun": "PF1.CondTypeStun",
  "sleep": "PF1.CondTypeSleep",
};

PF1.conditions = {
  "blind": "PF1.CondBlind",
  "dazzled": "PF1.CondDazzled",
  "deaf": "PF1.CondDeaf",
  "entangled": "PF1.CondEntangled",
  "fatigued": "PF1.CondFatigued",
  "exhausted": "PF1.CondExhausted",
  "grappled": "PF1.CondGrappled",
  "helpless": "PF1.CondHelpless",
  "paralyzed": "PF1.CondParalyzed",
  "pinned": "PF1.CondPinned",
  "fear": "PF1.CondFear",
  "sickened": "PF1.CondSickened",
  "stunned": "PF1.CondStunned",
};

PF1.buffTypes = {
  "temp": "PF1.Temporary",
  "perm": "PF1.Permanent",
  "item": "PF1.Item",
  "misc": "PF1.Misc",
};

PF1.buffTargets = {
  "ac": {
    "_label": "PF1.BuffTarAC",
    "ac": "PF1.BuffTarACGeneric",
    "aac": "PF1.BuffTarACArmor",
    "sac": "PF1.BuffTarACShield",
    "nac": "PF1.BuffTarACNatural",
  },
  "attack": {
    "_label": "PF1.AttackRollPlural",
    "attack": "PF1.All",
    "mattack": "PF1.Melee",
    "rattack": "PF1.Ranged",
  },
  "damage": {
    "_label": "PF1.Damage",
    "damage": "PF1.All",
    "wdamage": "PF1.WeaponDamage",
    "sdamage": "PF1.SpellDamage",
  },
  "ability": {
    "_label": "PF1.AbilityScore",
    "str": "PF1.AbilityStr",
    "dex": "PF1.AbilityDex",
    "con": "PF1.AbilityCon",
    "int": "PF1.AbilityInt",
    "wis": "PF1.AbilityWis",
    "cha": "PF1.AbilityCha",
  },
  "savingThrows": {
    "_label": "PF1.SavingThrowPlural",
    "allSavingThrows": "PF1.All",
    "fort": "PF1.SavingThrowFort",
    "ref": "PF1.SavingThrowRef",
    "will": "PF1.SavingThrowWill",
  },
  "skills": {
    "_label": "PF1.Skills",
    "skills": "PF1.All",
    "strSkills": "PF1.BuffTarStrSkills",
    "dexSkills": "PF1.BuffTarDexSkills",
    "conSkills": "PF1.BuffTarConSkills",
    "intSkills": "PF1.BuffTarIntSkills",
    "wisSkills": "PF1.BuffTarWisSkills",
    "chaSkills": "PF1.BuffTarChaSkills",
  },
  "skill": {
    "_label": "PF1.BuffTarSpecificSkill",
  },
  "abilityChecks": {
    "_label": "PF1.BuffTarAbilityChecks",
    "allChecks": "PF1.All",
    "strChecks": "PF1.BuffTarStrChecks",
    "dexChecks": "PF1.BuffTarDexChecks",
    "conChecks": "PF1.BuffTarConChecks",
    "intChecks": "PF1.BuffTarIntChecks",
    "wisChecks": "PF1.BuffTarWisChecks",
    "chaChecks": "PF1.BuffTarChaChecks",
  },
  "speed": {
    "_label": "PF1.Speed",
    "allSpeeds": "PF1.All",
    "landSpeed": "PF1.SpeedLand",
    "climbSpeed": "PF1.SpeedClimb",
    "swimSpeed": "PF1.SpeedSwim",
    "burrowSpeed": "PF1.SpeedBurrow",
    "flySpeed": "PF1.SpeedFly",
  },
  "misc": {
    "_label": "PF1.MiscShort",
    "cmb": "CMB",
    "cmd": "CMD",
    "init": "PF1.Initiative",
    "mhp": "Hit Points",
    "wounds": "PF1.Wounds",
    "vigor": "PF1.Vigor",
  },
};

PF1.contextNoteTargets = {
  "attacks": {
    "_label": "PF1.Attacks",
    "attack": "PF1.AttackRollPlural",
    "effect": "PF1.DamageRollPlural",
  },
  "savingThrows": {
    "_label": "PF1.SavingThrowPlural",
    "allSavingThrows": "PF1.All",
    "fort": "PF1.SavingThrowFort",
    "ref": "PF1.SavingThrowRef",
    "will": "PF1.SavingThrowWill",
  },
  "skills": {
    "_label": "PF1.Skills",
    "skills": "PF1.All",
    "strSkills": "PF1.BuffTarStrSkills",
    "dexSkills": "PF1.BuffTarDexSkills",
    "conSkills": "PF1.BuffTarConSkills",
    "intSkills": "PF1.BuffTarIntSkills",
    "wisSkills": "PF1.BuffTarWisSkills",
    "chaSkills": "PF1.BuffTarChaSkills",
  },
  "skill": {
    "_label": "PF1.BuffTarSpecificSkill",
  },
  "abilityChecks": {
    "_label": "PF1.BuffTarAbilityChecks",
    "allChecks": "PF1.All",
    "strChecks": "PF1.BuffTarStrChecks",
    "dexChecks": "PF1.BuffTarDexChecks",
    "conChecks": "PF1.BuffTarConChecks",
    "intChecks": "PF1.BuffTarIntChecks",
    "wisChecks": "PF1.BuffTarWisChecks",
    "chaChecks": "PF1.BuffTarChaChecks",
  },
  "misc": {
    "_label": "PF1.MiscShort",
    "ac": "PF1.ACNormal",
    "cmb": "CMB",
    "cmd": "CMD",
    "sr": "PF1.SpellResistance",
  },
};

// Languages
PF1.languages = {
  "common": "Common",
  "aboleth": "Aboleth",
  "abyssal": "Abyssal",
  "aklo": "Aklo",
  "aquan": "Aquan",
  "auran": "Auran",
  "boggard": "Boggard",
  "celestial": "Celestial",
  "common": "Common",
  "cyclops": "Cyclops",
  "dark": "Dark Folk",
  "draconic": "Draconic",
  "drowsign": "Drow Sign Language",
  "druidic": "Druidic",
  "dwarven": "Dwarven",
  "dziriak": "D'ziriak",
  "elven": "Elven",
  "giant": "Giant",
  "gnome": "Gnome",
  "goblin": "Goblin",
  "gnoll": "Gnoll",
  "grippli": "Grippli",
  "halfling": "Halfling",
  "ignan": "Ignan",
  "infernal": "Infernal",
  "nercil": "Necril",
  "orc": "Orc",
  "protean": "Protean",
  "sphinx": "Sphinx",
  "sylvan": "Sylvan",
  "tengu": "Tengu",
  "terran": "Terran",
  "treant": "Treant",
  "undercommon": "Undercommon",
  "vegepygmy": "Vegepygmy"
};

PF1.creatureTypes = {
  "aberration": "PF1.CreatureTypeAberration",
  "animal": "PF1.CreatureTypeAnimal",
  "construct": "PF1.CreatureTypeConstruct",
  "dragon": "PF1.CreatureTypeDragon",
  "fey": "PF1.CreatureTypeFey",
  "humanoid": "PF1.CreatureTypeHumanoid",
  "magicalBeast": "PF1.CreatureTypeMagicalBeast",
  "monstrousHumanoid": "PF1.CreatureTypeMonstrousHumanoid",
  "ooze": "PF1.CreatureTypeOoze",
  "outsider": "PF1.CreatureTypeOutsider",
  "plant": "PF1.CreatureTypePlant",
  "undead": "PF1.CreatureTypeUndead",
  "vermin": "PF1.CreatureTypeVermin",
};

PF1.sizeDie = [
  "1",
  "1d2",
  "1d3",
  "1d4",
  "1d6",
  "1d8",
  "1d10",
  "2d6",
  "2d8",
  "3d6",
  "3d8",
  "4d6",
  "4d8",
  "6d6",
  "6d8",
  "8d6",
  "8d8",
  "12d6",
  "12d8",
  "16d6",
  "16d8",
];

// Character Level XP Requirements
PF1.CHARACTER_EXP_LEVELS =  {
  slow: [
    0, 3000, 7500, 14000, 23000, 35000, 53000, 77000, 115000, 160000, 235000, 330000,
    475000, 665000, 955000, 1350000, 1900000, 2700000, 3850000, 5350000
  ],
  medium: [
    0, 2000, 5000, 9000, 15000, 23000, 35000, 51000, 75000, 105000, 155000, 220000,
    315000, 445000, 635000, 890000, 1300000, 1800000, 2550000, 3600000
  ],
  fast: [
    0, 1300, 3300, 6000, 10000, 15000, 23000, 34000, 50000, 71000, 105000, 145000,
    210000, 295000, 425000, 600000, 850000, 1200000, 1700000, 2400000
  ]
};

// Challenge Rating XP Levels
PF1.CR_EXP_LEVELS = [
  200, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400, 9600, 12800, 19200, 25600,
  38400, 51200, 76800, 102400, 153600, 204800, 307200, 409600, 614400, 819200, 1228800, 1638400, 2457600,
  3276800, 4915200, 6553600, 9830400
];

// Set initiative options
CONFIG.initiative.decimals = 2;
