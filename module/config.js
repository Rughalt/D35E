// Namespace D&D5e Configuration Values
export const D35E = {};

D35E.re = {
  "traitSeparator": /\s*[,;]\s*/g,
};


/**
 * The set of Ability Scores used within the system
 * @type {Object}
 */
D35E.abilities = {
  "str": "D35E.AbilityStr",
  "dex": "D35E.AbilityDex",
  "con": "D35E.AbilityCon",
  "int": "D35E.AbilityInt",
  "wis": "D35E.AbilityWis",
  "cha": "D35E.AbilityCha"
};

D35E.abilitiesShort = {
  "str": "D35E.AbilityShortStr",
  "dex": "D35E.AbilityShortDex",
  "con": "D35E.AbilityShortCon",
  "int": "D35E.AbilityShortInt",
  "wis": "D35E.AbilityShortWis",
  "cha": "D35E.AbilityShortCha"
};

D35E.abilityCost = {
  "7": -4,
  "8": -2,
  "9": -1,
  "10": 0,
  "11": 1,
  "12": 2,
  "13": 3,
  "14": 4,
  "15": 6,
  "16": 8,
  "17": 11,
  "18": 14,
};


/**
 * The set of Saving Throws
 * @type {Object}
 */
D35E.savingThrows = {
  "fort": "D35E.SavingThrowFort",
  "ref": "D35E.SavingThrowRef",
  "will": "D35E.SavingThrowWill"
};

/**
 * The set of modifiers for Saving Throws
 * @type {Object}
 */
D35E.savingThrowMods = {
  "fort": "con",
  "ref": "dex",
  "will": "wis"
};

D35E.classTypes = {
  "base": "D35E.ClassTypeBase",
  "prestige": "D35E.ClassTypePrestige",
  "racial": "D35E.ClassTypeRacial",
  "minion": "D35E.Minion",
  "template": "D35E.ClassTypeTemplate",
};

D35E.classBAB = {
  "low": "D35E.Low",
  "med": "D35E.Medium",
  "high": "D35E.High",
};

D35E.classSavingThrows = {
  "low": "D35E.Poor",
  "high": "D35E.Good",
};

D35E.classBABFormulas = {
  "low": "floor(@level * 0.5)",
  "med": "floor(@level * 0.75)",
  "high": "@level",
};

D35E.classSavingThrowFormulas = {
  "base": {
    "low": "floor(@level / 3)",
    "high": "2 + floor(@level / 2)",
  },
  "prestige": {
    "low": "floor(@level / 3)",
    "high": "2 + floor(@level / 2)",
  },
  "racial": {
    "low": "floor(@level / 3)",
    "high": "2 + floor(@level / 2)",
  },
  "minion": {
    "low": "floor(@level / 3)",
    "high": "2 + floor(@level / 2)",
  },
  "template": {
    "low": "0",
    "high": "0",
  },
};

D35E.favouredClassBonuses = {
  "hp": "D35E.FavouredClassHP",
  "skill": "D35E.FavouredClassSkill",
  "alt": "D35E.FavouredClassAlt",
};

/**
 * The set of Armor Classes
 * @type {Object}
 */
D35E.ac = {
  "normal": "D35E.ACNormal",
  "touch": "D35E.ACTouch",
  "flatFooted": "D35E.ACFlatFooted"
};

D35E.acShort = {
  "normal": "D35E.ACNormal",
  "touch": "D35E.ACTouch",
  "flatFooted": "D35E.ACFlatFootedShort"
};

/**
 * The set of Armor Class modifier types
 * @type {Object}
 */
D35E.acValueLabels = {
  "normal": "D35E.ACTypeNormal",
  "touch": "D35E.ACTypeTouch",
  "flatFooted": "D35E.ACTypeFlatFooted"
};

/* -------------------------------------------- */

/**
 * Character alignment options
 * @type {Object}
 */
D35E.alignments = {
  'lg': "D35E.AlignmentLG",
  'ng': "D35E.AlignmentNG",
  'cg': "D35E.AlignmentCG",
  'ln': "D35E.AlignmentLN",
  'tn': "D35E.AlignmentTN",
  'cn': "D35E.AlignmentCN",
  'le': "D35E.AlignmentLE",
  'ne': "D35E.AlignmentNE",
  'ce': "D35E.AlignmentCE"
};

/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have
 * @type {Object}
 */
D35E.armorProficiencies = {
  "lgt": "D35E.ArmorProfLight",
  "med": "D35E.ArmorProfMedium",
  "hvy": "D35E.ArmorProfHeavy",
  "shl": "D35E.ArmorProfShield",
  "twr": "D35E.ArmorProfTowerShield",
};

D35E.weaponProficiencies = {
  "sim": "D35E.WeaponProfSimple",
  "mar": "D35E.WeaponProfMartial",
};

/* -------------------------------------------- */

/**
 * This describes the ways that an ability can be activated
 * @type {Object}
 */
D35E.abilityActivationTypes = {
  "passive": "D35E.ActivationTypePassive",
  "free": "D35E.ActivationTypeFree",
  "swift": "D35E.ActivationTypeSwift",
  "immediate": "D35E.ActivationTypeImmediate",
  "move": "D35E.ActivationTypeMove",
  "standard": "D35E.ActivationTypeStandard",
  "full": "D35E.ActivationTypeFullround",
  "attack": "D35E.ActivationTypeAttack",
  "round": "D35E.ActivationTypeRound",
  "minute": "D35E.ActivationTypeMinute",
  "hour": "D35E.ActivationTypeHour",
  "special": "D35E.ActivationTypeSpecial",
};

/**
 * This describes plurals for activation types.
 */
D35E.abilityActivationTypesPlurals = {
  "free": "D35E.ActivationTypeFreePlural",
  "swift": "D35E.ActivationTypeSwiftPlural",
  "immediate": "D35E.ActivationTypeImmediatePlural",
  "move": "D35E.ActivationTypeMovePlural",
  "standard": "D35E.ActivationTypeStandardPlural",
  "full": "D35E.ActivationTypeFullroundPlural",
  "attack": "D35E.ActivationTypeAttackPlural",
  "round": "D35E.ActivationTypeRoundPlural",
  "minute": "D35E.ActivationTypeMinutePlural",
  "hour": "D35E.ActivationTypeHourPlural",
};

D35E.divineFocus = {
  "0": "",
  "1": "D35E.SpellComponentDivineFocusAlone",
  "2": "D35E.SpellComponentDivineFocusMaterial",
  "3": "D35E.SpellComponentDivineFocusFocus",
};

D35E.measureTemplateTypes = {
  "cone": "D35E.MeasureTemplateCone",
  "circle": "D35E.MeasureTemplateCircle",
  "ray": "D35E.MeasureTemplateRay",
  "cube": "D35E.MeasureTemplateCube",
};

/* -------------------------------------------- */

// Creature Sizes
D35E.actorSizes = {
  "fine": "D35E.ActorSizeFine",
  "dim": "D35E.ActorSizeDiminutive",
  "tiny": "D35E.ActorSizeTiny",
  "sm": "D35E.ActorSizeSmall",
  "med": "D35E.ActorSizeMedium",
  "lg": "D35E.ActorSizeLarge",
  "huge": "D35E.ActorSizeHuge",
  "grg": "D35E.ActorSizeGargantuan",
  "col": "D35E.ActorSizeColossal",
};

// Token Sizes
D35E.actorTokenSizes = {
  "actor": "D35E.ActorSizeActor",
  "fine": "D35E.ActorSizeFine",
  "dim": "D35E.ActorSizeDiminutive",
  "tiny": "D35E.ActorSizeTiny",
  "sm": "D35E.ActorSizeSmall",
  "med": "D35E.ActorSizeMedium",
  "lg": "D35E.ActorSizeLarge",
  "lglong": "D35E.ActorSizeLargeLong",
  "huge": "D35E.ActorSizeHuge",
  "grg": "D35E.ActorSizeGargantuan",
  "col": "D35E.ActorSizeColossal",
  "none": "D35E.ActorSizeDoNotLink",
};

D35E.sizeChart = {
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

D35E.tokenSizes = {
  "fine": { w: 1, h: 1, scale: 0.2 },
  "dim": { w: 1, h: 1, scale: 0.4 },
  "tiny": { w: 1, h: 1, scale: 0.6 },
  "sm": { w: 1, h: 1, scale: 0.8 },
  "med": { w: 1, h: 1, scale: 1 },
  "lg": { w: 2, h: 2, scale: 1 },
  "lglong": { w: 1, h: 2, scale: 1 },
  "huge": { w: 3, h: 3, scale: 1 },
  "grg": { w: 4, h: 4, scale: 1 },
  "col": { w: 6, h: 6, scale: 1 },
};

D35E.sizeMods = {
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

D35E.sizeSpecialMods = {
  "fine": -16,
  "dim": -12,
  "tiny": -8,
  "sm": -4,
  "med": 0,
  "lg": 4,
  "huge": 8,
  "grg": 12,
  "col": 16
};

D35E.sizeFlyMods = {
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

D35E.sizeStealthMods = {
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

D35E.abilityTypes = {
  "nat": "D35E.Natural",
  "su": "D35E.Extraordinary",
  "ex": "D35E.Supernatural",
  "sp": "D35E.SpellLike",
  "other": "D35E.Other"
};


D35E.flyManeuverabilities = {
  "clumsy": "D35E.FlyManeuverabilityClumsy",
  "poor": "D35E.FlyManeuverabilityPoor",
  "average": "D35E.FlyManeuverabilityAverage",
  "good": "D35E.FlyManeuverabilityGood",
  "perfect": "D35E.FlyManeuverabilityPerfect",
};

D35E.flyManeuverabilityValues = {
  "clumsy": -8,
  "poor": -4,
  "average": 0,
  "good": 4,
  "perfect": 8,
};

D35E.speedReduction = {
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

D35E.carryingCapacityFormula = "(10*@str)*(max(@str,11)-@str)/(max(11-@str,1))+(5*pow(2,(-2)+floor(@str/5)))*(20+floor(47*pow(2,0.1*(@str%5))-47))*(min(@str,10)-@str)/(min(10-@str,-1))"; 
// D35E.carryingCapacityFormula = "(10*@str)"

D35E.encumbranceMultipliers = {
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
D35E.itemActionTypes = {
  "mwak": "D35E.ActionMWAK",
  "rwak": "D35E.ActionRWAK",
  "msak": "D35E.ActionMSAK",
  "rsak": "D35E.ActionRSAK",
  "spellsave": "D35E.ActionSpellSave",
  "save": "D35E.ActionSave",
  "heal": "D35E.ActionHeal",
  "other": "D35E.ActionOther",
  "special": "D35E.ActionSpecial"
};

/* -------------------------------------------- */

D35E.itemCapacityTypes = {
  "items": "D35E.ItemContainerCapacityItems",
  "weight": "D35E.ItemContainerCapacityWeight"
};

/* -------------------------------------------- */

/**
 * Enumerate the lengths of time over which an item can have limited use ability
 * @type {Object}
 */
D35E.limitedUsePeriods = {
  "single": "D35E.LimitedUseSingle",
  "unlimited": "D35E.Unlimited",
  "day": "D35E.LimitedUseDay",
  "encounter": "D35E.LimitedUseEncounter",
  "week": "D35E.LimitedUseWeek",
  "charges": "D35E.LimitedUseCharges",
};


/* -------------------------------------------- */

// Equipment Types
D35E.equipmentTypes = {
  "armor": {
    "_label": "D35E.EquipTypeArmor",
    "lightArmor": "D35E.EquipTypeLight",
    "mediumArmor": "D35E.EquipTypeMedium",
    "heavyArmor": "D35E.EquipTypeHeavy",
  },
  "shield": {
    "_label": "D35E.EquipTypeShield",
    "lightShield": "D35E.EquipTypeLightShield",
    "heavyShield": "D35E.EquipTypeHeavyShield",
    "towerShield": "D35E.EquipTypeTowerShield",
    "other": "D35E.EquipTypeOtherShield",
  },
  "misc": {
    "_label": "D35E.Misc",
    "wondrous": "D35E.EquipTypeWondrousItem",
    "clothing": "D35E.EquipTypeClothing",
    "other": "D35E.Other",
  },
};

D35E.equipmentSlots = {
  "armor": {
    "armor": "D35E.EquipSlotArmor",
  },
  "shield": {
    "shield": "D35E.EquipSlotShield",
  },
  "misc": {
    "slotless": "D35E.EquipSlotSlotless",
    "head": "D35E.EquipSlotHead",
    "headband": "D35E.EquipSlotHeadband",
    "eyes": "D35E.EquipSlotEyes",
    "shoulders": "D35E.EquipSlotShoulders",
    "neck": "D35E.EquipSlotNeck",
    "chest": "D35E.EquipSlotChest",
    "body": "D35E.EquipSlotBody",
    "belt": "D35E.EquipSlotBelt",
    "wrists": "D35E.EquipSlotWrists",
    "hands": "D35E.EquipSlotHands",
    "ring": "D35E.EquipSlotRing",
    "feet": "D35E.EquipSlotFeet",
  },
};

D35E.lootTypes = {
  "gear": "D35E.LootTypeGear",
  "ammo": "D35E.LootTypeAmmo",
  "tradeGoods": "D35E.LootTypeTradeGoods",
  "misc": "D35E.Misc",
  "container": "D35E.Container",
};

D35E.magicAuraByLevel = {
  "spell": [
    { power: "faint", level: 1 },
    { power: "moderate", level: 4 },
    { power: "strong", level: 7 },
    { power: "overwhelming", level: 10 },
  ],
  "item": [
    { power: "faint", level: 1 },
    { power: "moderate", level: 6 },
    { power: "strong", level: 12 },
    { power: "overwhelming", level: 21 },
  ],
};


/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system
 * @type {Object}
 */
D35E.consumableTypes = {
  "potion": "D35E.ConsumableTypePotion",
  "poison": "D35E.ConsumableTypePoison",
  "drug": "D35E.ConsumableTypeDrug",
  "scroll": "D35E.ConsumableTypeScroll",
  "wand": "D35E.ConsumableTypeWand",
  "dorje": "D35E.ConsumableTypeDorje",
  "powerstone": "D35E.ConsumableTypePowerStone",
  "tattoo": "D35E.ConsumableTypeTattoo",
  "crystal": "D35E.ConsumableTypeCrystal",
  "misc": "D35E.Misc",
};

D35E.attackTypes = {
  "weapon": "D35E.AttackTypeWeapon",
  "natural": "D35E.AttackTypeNatural",
  "ability": "D35E.AttackTypeAbility",
  "racialAbility": "D35E.AttackTypeRacial",
  "misc": "D35E.Misc",
};

D35E.attackTypesShort = {
  "weapon": "D35E.AttackTypeWeaponShort",
  "natural": "D35E.AttackTypeNaturalShort",
  "ability": "D35E.AttackTypeAbilityShort",
  "racialAbility": "D35E.AttackTypeRacialShort",
  "misc": "D35E.Misc",
};

D35E.featTypes = {
  "feat": "D35E.FeatTypeFeat",
  "classFeat": "D35E.FeatTypeClassFeat",
  "trait": "D35E.FeatTypeTraits",
  "racial": "D35E.FeatTypeRacial",
  "spellSpecialization": "D35E.FeatTypeSpellSpecialization",
  "misc": "D35E.Misc",
};

/* -------------------------------------------- */

/**
 * The valid currency denominations supported by the 5e system
 * @type {Object}
 */
D35E.currencies = {
  "pp": "D35E.CurrencyPP",
  "gp": "D35E.CurrencyGP",
  "sp": "D35E.CurrencySP",
  "cp": "D35E.CurrencyCP",
};

D35E.acTypes = {
  "armor": "Armor",
  "shield": "Shield",
  "natural": "Natural Armor",
};

D35E.bonusModifiers = {
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
  "replace": "Replace",
};

/* -------------------------------------------- */


// Damage Types
D35E.damageTypes = {
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

D35E.distanceUnits = {
  "none": "D35E.None",
  "personal": "D35E.DistPersonal",
  "touch": "D35E.DistTouch",
  "close": "D35E.DistClose",
  "medium": "D35E.DistMedium",
  "long": "D35E.DistLong",
  "ft": "D35E.DistFt",
  "mi": "D35E.DistMi",
  "spec": "D35E.Special",
  "seeText": "D35E.SeeText",
  "unlimited": "D35E.Unlimited",
};

D35E.distanceUnitsShort = {
  "none": "D35E.None",
  "personal": "D35E.DistPersonal",
  "touch": "D35E.DistTouch",
  "close": "D35E.DistClose",
  "medium": "D35E.DistMedium",
  "long": "D35E.DistLong",
  "ft": "D35E.DistFtShort",
  "mi": "D35E.DistMiShort",
  "spec": "D35E.Special",
  "seeText": "D35E.SeeText",
  "unlimited": "D35E.Unlimited",
};

/* -------------------------------------------- */

/**
 * This Object defines the types of single or area targets which can be applied in D&D5e
 * @type {Object}
 */
D35E.targetTypes = {
  "none": "D35E.None",
  "self": "D35E.TargetSelf",
  "creature": "D35E.TargetCreature",
  "ally": "D35E.TargetAlly",
  "enemy": "D35E.TargetEnemy",
  "object": "D35E.TargetObject",
  "space": "D35E.TargetSpace",
  "radius": "D35E.TargetRadius",
  "sphere": "D35E.TargetSphere",
  "cylinder": "D35E.TargetCylinder",
  "cone": "D35E.TargetCone",
  "square": "D35E.TargetSquare",
  "cube": "D35E.TargetCube",
  "line": "D35E.TargetLine",
  "wall": "D35E.TargetWall"
};

/* -------------------------------------------- */

/**
 * This Object defines the various lengths of time which can occur in D35E
 * @type {Object}
 */
D35E.timePeriods = {
  "inst": "D35E.TimeInst",
  "turn": "D35E.TimeTurn",
  "round": "D35E.TimeRound",
  "minute": "D35E.TimeMinute",
  "hour": "D35E.TimeHour",
  "day": "D35E.TimeDay",
  "month": "D35E.TimeMonth",
  "year": "D35E.TimeYear",
  "perm": "D35E.TimePerm",
  "seeText": "D35E.SeeText",
  "spec": "D35E.Special",
};

/* -------------------------------------------- */

// Healing Types
D35E.healingTypes = {
  "healing": "D35E.Healing",
  "temphp": "D35E.HealingTemp"
};

D35E.areaTargetTypes = {
  cone: "cone",
  cube: "rect",
  cylinder: "circle",
  circle: "circle",
  line: "ray",
  ray: "ray",
  radius: "circle",
  sphere: "circle",
  square: "rect",
  wall: "ray"
};


/* -------------------------------------------- */

/**
 * Character senses options
 * @type {Object}
 */
D35E.senses = {
  "bs": "D35E.SenseBS",
  "dv": "D35E.SenseDV",
  "ts": "D35E.SenseTS",
  "tr": "D35E.SenseTR",
  "ll": "D35E.SenseLL"
};


/* -------------------------------------------- */

/**
 * The set of skill which can be trained in D35E
 * @type {Object}
 */
D35E.skills = {
  "apr": "D35E.SkillApr",
  "blc": "D35E.SkillBlc",
  "blf": "D35E.SkillBlf",
  "clm": "D35E.SkillClm",
  "coc": "D35E.SkillCoc",
  "crf": "D35E.SkillCrf",
  "dsc": "D35E.SkillDsc", 
  "dip": "D35E.SkillDip",
  "dev": "D35E.SkillDev",
  "dis": "D35E.SkillDis",
  "esc": "D35E.SkillEsc",
  "fog": "D35E.SkillFog",
  "gif": "D35E.SkillGif",
  "han": "D35E.SkillHan",
  "hea": "D35E.SkillHea",
  "hid": "D35E.SkillHid",
  "int": "D35E.SkillInt",
  "jmp": "D35E.SkillJmp",
  "kar": "D35E.SkillKAr",
  "kdu": "D35E.SkillKDu",
  "ken": "D35E.SkillKEn",
  "kge": "D35E.SkillKGe",
  "khi": "D35E.SkillKHi",
  "klo": "D35E.SkillKLo",
  "kna": "D35E.SkillKNa",
  "kno": "D35E.SkillKNo",
  "kpl": "D35E.SkillKPl",
  "kre": "D35E.SkillKRe",
  "kps": "D35E.SkillKPs",
  "lis": "D35E.SkillLis",
  "mos": "D35E.SkillMos",
  "opl": "D35E.SkillOpl",
  "prf": "D35E.SkillPrf",
  "pro": "D35E.SkillPro",
  "rid": "D35E.SkillRid",
  "src": "D35E.SkillSrc",
  "sen": "D35E.SkillSen",
  "slt": "D35E.SkillSlt",
  "spl": "D35E.SkillSpl",
  "spt": "D35E.SkillSpt",
  "sur": "D35E.SkillSur",
  "swm": "D35E.SkillSwm",
  "tmb": "D35E.SkillTmb",
  "umd": "D35E.SkillUMD",
  "uro": "D35E.SkillUro",
  "aut": "D35E.SkillAut",
  "psi": "D35E.SkillPsi",
  "upd": "D35E.SkillUPD"
};

D35E.arbitrarySkills = [
  "art", "crf", "lor", "prf", "pro"
];


/* -------------------------------------------- */

D35E.spellPreparationModes = {
  "atwill": "D35E.SpellPrepAtWill",
  "prepared": "D35E.SpellPrepPrepared",
  "spontaneous": "D35E.SpellPrepSpontaneous",
};

/* -------------------------------------------- */

/* -------------------------------------------- */

// Weapon Types
D35E.weaponTypes = {
  "simple": {
    "_label": "D35E.WeaponTypeSimple",
    "light": "D35E.WeaponPropLight",
    "1h": "D35E.WeaponPropOneHanded",
    "2h": "D35E.WeaponPropTwoHanded",
    "ranged": "D35E.WeaponSubtypeRanged",
  },
  "martial": {
    "_label": "D35E.WeaponTypeMartial",
    "light": "D35E.WeaponPropLight",
    "1h": "D35E.WeaponPropOneHanded",
    "2h": "D35E.WeaponPropTwoHanded",
    "ranged": "D35E.WeaponSubtypeRanged",
  },
  "exotic": {
    "_label": "D35E.WeaponTypeExotic",
    "light": "D35E.WeaponPropLight",
    "1h": "D35E.WeaponPropOneHanded",
    "2h": "D35E.WeaponPropTwoHanded",
    "ranged": "D35E.WeaponSubtypeRanged",
  },
  "misc": {
    "_label": "D35E.Misc",
    "splash": "D35E.WeaponTypeSplash",
    "other": "D35E.Other",
  }
};


/* -------------------------------------------- */

/**
 * Define the set of weapon property flags which can exist on a weapon
 * @type {Object}
 */
D35E.weaponProperties = {
  "blc": "D35E.WeaponPropBlocking",
  "brc": "D35E.WeaponPropBrace",
  "dbl": "D35E.WeaponPropDouble",
  "dis": "D35E.WeaponPropDisarm",
  "fin": "D35E.WeaponPropFinesse",
  "frg": "D35E.WeaponPropFragile",
  "grp": "D35E.WeaponPropGrapple",
  "imp": "D35E.WeaponPropImprovised",
  "mnk": "D35E.WeaponPropMonk",
  "nnl": "D35E.WeaponPropNonLethal",
  "prf": "D35E.WeaponPropPerformance",
  "rch": "D35E.WeaponPropReach",
  "ret": "D35E.Returning",
  "snd": "D35E.WeaponPropSunder",
  "thr": "D35E.WeaponPropThrown",
  "trp": "D35E.WeaponPropTrip",
};

D35E.weaponEnhancementProperties = {
  "thr": "D35E.WeaponEnhPropThrown",
  "kee": "D35E.WeaponEnhPropKeen",
  "dis": "D35E.WeaponEnhPropDistance",
  "mnk": "D35E.WeaponEnhPropKi",
  "spd": "D35E.WeaponEnhPropSpeed",
  "def": "D35E.WeaponEnhPropDefending",
};

// Spell Components
D35E.spellComponents = {
  "V": "D35E.SpellComponentVerbal",
  "S": "D35E.SpellComponentSomatic",
  "M": "D35E.SpellComponentMaterial",
  "F": "D35E.SpellComponentFocus",
  "DF": "D35E.SpellComponentDivineFocus",
};

// Spell Schools
D35E.spellSchools = {
  "abj": "D35E.SpellSchoolAbjuration",
  "con": "D35E.SpellSchoolConjuration",
  "div": "D35E.SpellSchoolDivination",
  "enc": "D35E.SpellSchoolEnchantment",
  "evo": "D35E.SpellSchoolEvocation",
  "ill": "D35E.SpellSchoolIllusion",
  "nec": "D35E.SpellSchoolNecromancy",
  "trs": "D35E.SpellSchoolTransmutation",
  "uni": "D35E.SpellSchoolUniversal",

  "cla": "D35E.PowerSchoolClairsentience",
  "met": "D35E.PowerSchoolMetacreativity",
  "kin": "D35E.PowerSchoolPsychokinesis",
  "bol": "D35E.PowerSchoolPsychometabolism",
  "por": "D35E.PowerSchoolPsychoportation",
  "tel": "D35E.PowerSchoolTelepathy",
  "misc": "D35E.Misc",
};

// Spell Levels
D35E.spellLevels = {
  0: "D35E.SpellLevel0",
  1: "D35E.SpellLevel1",
  2: "D35E.SpellLevel2",
  3: "D35E.SpellLevel3",
  4: "D35E.SpellLevel4",
  5: "D35E.SpellLevel5",
  6: "D35E.SpellLevel6",
  7: "D35E.SpellLevel7",
  8: "D35E.SpellLevel8",
  9: "D35E.SpellLevel9",
};

/* -------------------------------------------- */

/**
 * Weapon proficiency levels
 * Each level provides a proficiency multiplier
 * @type {Object}
 */
D35E.proficiencyLevels = {
  "-4": "Not Proficient",
  0: "Proficient"
};

/* -------------------------------------------- */

D35E.conditionTypes = {
  "bleed": "D35E.CondTypeBleed",
  "blind": "D35E.CondTypeBlind",
  "confuse": "D35E.CondTypeConfuse",
  "daze": "D35E.CondTypeDaze",
  "dazzle": "D35E.CondTypeDazzle",
  "deaf": "D35E.CondTypeDeaf",
  "disease": "D35E.CondTypeDisease",
  "energyDrain": "D35E.CondTypeEnergyDrain",
  "fatigue": "D35E.CondTypeFatigue",
  "fear": "D35E.CondTypeFear",
  "mindAffecting": "D35E.CondTypeMindAffecting",
  "poison": "D35E.CondTypePoison",
  "sicken": "D35E.CondTypeSicken",
  "paralyze": "D35E.CondTypeParalyze",
  "petrify": "D35E.CondTypePetrify",
  "stun": "D35E.CondTypeStun",
  "sleep": "D35E.CondTypeSleep",
};

D35E.conditions = {
  "blind": "D35E.CondBlind",
  "dazzled": "D35E.CondDazzled",
  "deaf": "D35E.CondDeaf",
  "entangled": "D35E.CondEntangled",
  "fatigued": "D35E.CondFatigued",
  "exhausted": "D35E.CondExhausted",
  "grappled": "D35E.CondGrappled",
  "helpless": "D35E.CondHelpless",
  "paralyzed": "D35E.CondParalyzed",
  "pinned": "D35E.CondPinned",
  "fear": "D35E.CondFear",
  "sickened": "D35E.CondSickened",
  "stunned": "D35E.CondStunned",
  "shaken": "D35E.CondShaken",
  "polymorphed": "D35E.CondPolymorphed",
  "wildshaped": "D35E.CondWildshaped",
};

D35E.conditionTextures = {
  bleed: "systems/D35E/icons/conditions/bleeding.png",
  blind: "systems/D35E/icons/conditions/blind.png",
  confused: "systems/D35E/icons/conditions/confused.png",
  dazzled: "systems/D35E/icons/conditions/dazzled.png",
  deaf: "systems/D35E/icons/conditions/deaf.png",
  entangled: "systems/D35E/icons/conditions/entangled.png",
  fatigued: "systems/D35E/icons/conditions/fatigued.png",
  exhausted: "systems/D35E/icons/conditions/exhausted.png",
  grappled: "systems/D35E/icons/conditions/grappled.png",
  helpless: "systems/D35E/icons/conditions/helpless.png",
  incorporeal: "systems/D35E/icons/conditions/incorporeal.png",
  invisible: "systems/D35E/icons/conditions/invisible.png",
  paralyzed: "systems/D35E/icons/conditions/paralyzed.png",
  pinned: "systems/D35E/icons/conditions/pinned.png",
  prone: "systems/D35E/icons/conditions/prone.png",
  fear: "systems/D35E/icons/conditions/fear.png",
  sickened: "systems/D35E/icons/conditions/sickened.png",
  shaken: "systems/D35E/icons/conditions/shaken.png",
  stunned: "systems/D35E/icons/conditions/stunned.png",
};


D35E.buffTypes = {
  "temp": "D35E.Temporary",
  "perm": "D35E.Permanent",
  "item": "D35E.Item",
  "shapechange": "D35E.Shapechange",
  "misc": "D35E.Misc",
};

D35E.buffTargets = {
  "ac": {
    "_label": "D35E.BuffTarAC",
    "ac": "D35E.BuffTarACGeneric",
    "aac": "D35E.BuffTarACArmor",
    "sac": "D35E.BuffTarACShield",
    "nac": "D35E.BuffTarACNatural",
    "tch": "D35E.BuffTarACTouch",
    "pac": "D35E.BuffTarACOnly",
  },
  "attack": {
    "_label": "D35E.AttackRollPlural",
    "attack": "D35E.All",
    "mattack": "D35E.Melee",
    "rattack": "D35E.Ranged",
    "babattack": "D35E.BAB",
  },
  "damage": {
    "_label": "D35E.Damage",
    "damage": "D35E.All",
    "wdamage": "D35E.WeaponDamage",
    "sdamage": "D35E.SpellDamage",
  },
  "ability": {
    "_label": "D35E.AbilityScore",
    "str": "D35E.AbilityStr",
    "dex": "D35E.AbilityDex",
    "con": "D35E.AbilityCon",
    "int": "D35E.AbilityInt",
    "wis": "D35E.AbilityWis",
    "cha": "D35E.AbilityCha",
  },
  "savingThrows": {
    "_label": "D35E.SavingThrowPlural",
    "allSavingThrows": "D35E.All",
    "fort": "D35E.SavingThrowFort",
    "ref": "D35E.SavingThrowRef",
    "will": "D35E.SavingThrowWill",
  },
  "skills": {
    "_label": "D35E.Skills",
    "skills": "D35E.All",
    "strSkills": "D35E.BuffTarStrSkills",
    "dexSkills": "D35E.BuffTarDexSkills",
    "conSkills": "D35E.BuffTarConSkills",
    "intSkills": "D35E.BuffTarIntSkills",
    "wisSkills": "D35E.BuffTarWisSkills",
    "chaSkills": "D35E.BuffTarChaSkills",
    "perfSkills": "D35E.BuffTarPerfSkills",
    "craftSkills": "D35E.BuffTarCraftSkills",
    "profSkills": "D35E.BuffTarProfSkills",
    "knowSkills": "D35E.BuffTarKnowSkills",
  },
  "skill": {
    "_label": "D35E.BuffTarSpecificSkill",
  },
  "abilityChecks": {
    "_label": "D35E.BuffTarAbilityChecks",
    "allChecks": "D35E.All",
    "strChecks": "D35E.BuffTarStrChecks",
    "dexChecks": "D35E.BuffTarDexChecks",
    "conChecks": "D35E.BuffTarConChecks",
    "intChecks": "D35E.BuffTarIntChecks",
    "wisChecks": "D35E.BuffTarWisChecks",
    "chaChecks": "D35E.BuffTarChaChecks",
  },
  "speed": {
    "_label": "D35E.Speed",
    "allSpeeds": "D35E.All",
    "landSpeed": "D35E.SpeedLand",
    "climbSpeed": "D35E.SpeedClimb",
    "swimSpeed": "D35E.SpeedSwim",
    "burrowSpeed": "D35E.SpeedBurrow",
    "flySpeed": "D35E.SpeedFly",
  },
  "psionic": {
    "_label": "D35E.Psionics",
    "powerPoints": "D35E.PowerPointsBonus",
  },
  "spells": {
    "_label": "D35E.BuffSpellbookSpellsPrepared"
  },
  "spellcastingAbility": {
    "_label": "D35E.BuffSpellbookSpellcastingAbility",
    "scaPrimary": "Primary",
    "scaSecondary": "Secondary",
    "scaTetriary": "Tetriary",
    "scaSpelllike": "Spelllike"
  },
  "misc": {
    "_label": "D35E.MiscShort",
    "cmb": "Grapple",
    "cmd": "CMD (Unused)",
    "init": "D35E.Initiative",
    "mhp": "Hit Points",
    "wounds": "D35E.Wounds",
    "vigor": "D35E.Vigor",
    "sneakAttack": "D35E.SneakAttackBonusDice",
    "turnUndead": "D35E.TurnUndeadUses",
    "turnUndeadDiceTotal": "D35E.TurnUndeadDiceTotal",
    "regen": "D35E.Regeneration",
    "fastHeal": "D35E.FastHealing",
    "spellResistance": "D35E.SpellResistance",
    "cr": "D35E.CR",
    "fortification": "D35E.Fortification",
    "asf": "D35E.ArcaneSpellFailure",
    "concealment": "D35E.Concealment"
  },
  "prestigeCl": {
    "_label": "D35E.PrestigeCl",
    "arcaneCl": "D35E.Arcane",
    "psionicCl": "D35E.Psionic",
    "divineCl": "D35E.Divine",
    "cardCl": "D35E.Cards"
  }
};

D35E.contextNoteTargets = {
  "attacks": {
    "_label": "D35E.Attacks",
    "attack": "D35E.AttackRollPlural",
    "effect": "D35E.DamageRollPlural",
  },
  "savingThrows": {
    "_label": "D35E.SavingThrowPlural",
    "allSavingThrows": "D35E.All",
    "fort": "D35E.SavingThrowFort",
    "ref": "D35E.SavingThrowRef",
    "will": "D35E.SavingThrowWill",
  },
  "skills": {
    "_label": "D35E.Skills",
    "skills": "D35E.All",
    "strSkills": "D35E.BuffTarStrSkills",
    "dexSkills": "D35E.BuffTarDexSkills",
    "conSkills": "D35E.BuffTarConSkills",
    "intSkills": "D35E.BuffTarIntSkills",
    "wisSkills": "D35E.BuffTarWisSkills",
    "chaSkills": "D35E.BuffTarChaSkills",
  },
  "skill": {
    "_label": "D35E.BuffTarSpecificSkill",
  },
  "abilityChecks": {
    "_label": "D35E.BuffTarAbilityChecks",
    "allChecks": "D35E.All",
    "strChecks": "D35E.BuffTarStrChecks",
    "dexChecks": "D35E.BuffTarDexChecks",
    "conChecks": "D35E.BuffTarConChecks",
    "intChecks": "D35E.BuffTarIntChecks",
    "wisChecks": "D35E.BuffTarWisChecks",
    "chaChecks": "D35E.BuffTarChaChecks",
  },
  "misc": {
    "_label": "D35E.MiscShort",
    "ac": "D35E.ACNormal",
    "cmb": "CMB",
    "cmd": "CMD",
    "sr": "D35E.SpellResistance"
  },
};

// Languages
D35E.languages = {
  "common": "Common",
  "abyssal": "Abyssal",
  "aquan": "Aquan",
  "auran": "Auran",
  "celestial": "Celestial",
  "draconic": "Draconic",
  "druidic": "Druidic",
  "dwarven": "Dwarven",
  "elven": "Elven",
  "giant": "Giant",
  "gnome": "Gnome",
  "goblin": "Goblin",
  "gnoll": "Gnoll",
  "halfling": "Halfling",
  "ignan": "Ignan",
  "infernal": "Infernal",
  "orc": "Orc",
  "sylvan": "Sylvan",
  "terran": "Terran",
  "treant": "Treant",
  "undercommon": "Undercommon",
};

D35E.creatureTypes = {
  "aberration": "D35E.CreatureTypeAberration",
  "animal": "D35E.CreatureTypeAnimal",
  "construct": "D35E.CreatureTypeConstruct",
  "dragon": "D35E.CreatureTypeDragon",
  "fey": "D35E.CreatureTypeFey",
  "humanoid": "D35E.CreatureTypeHumanoid",
  "magicalBeast": "D35E.CreatureTypeMagicalBeast",
  "monstrousHumanoid": "D35E.CreatureTypeMonstrousHumanoid",
  "ooze": "D35E.CreatureTypeOoze",
  "outsider": "D35E.CreatureTypeOutsider",
  "plant": "D35E.CreatureTypePlant",
  "undead": "D35E.CreatureTypeUndead",
  "vermin": "D35E.CreatureTypeVermin",
  "giant": "D35E.CreatureTypeGiant",
  "elemental": "D35E.CreatureTypeElemental",
};

D35E.sizeDie = [
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
// Slow is medium x2
// Fast is medium *0.75
D35E.CHARACTER_EXP_LEVELS =  {
  slow: [
    0, 2000, 6000, 12000, 20000, 30000, 42000, 56000, 72000, 90000, 110000, 132000,
    156000, 182000, 210000, 140000, 272000, 306000, 342000, 384000
  ],
  medium: [
    0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000,
    78000, 91000, 105000, 120000, 136000, 153000, 171000, 190000, 210000, 231000, 253000, 276000, 300000, 325000, 351000, 378000, 406000, 435000, 465000, 496000, 528000, 561000, 595000, 630000, 666000, 703000, 741000, 780000, 820000, 861000, 903000, 946000, 990000, 1035000, 1081000, 1128000, 1176000, 1225000
  ],
  fast: [
    0, 750, 2250, 4500, 7500, 11250, 15750, 21000, 27000, 33750, 41250, 49500,
    58500, 68250, 78750, 90000, 102000, 114750, 128250, 142500
  ]
};

// Challenge Rating XP Levels
D35E.CR_EXP_LEVELS = [
  200, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400, 9600, 12800, 19200, 25600,
  38400, 51200, 76800, 102400, 153600, 204800, 307200, 409600, 614400, 819200, 1228800, 1638400, 2457600,
  3276800, 4915200, 6553600, 9830400
];

D35E.enhancementType = {
  'weapon': 'D35E.Weapon',
  'armor': 'D35E.Armor',
  'misc': 'D35E.Misc',
};

D35E.twoWeaponAttackType = {
  'primary': 'D35E.TwoWeaponPrimary',
  'two-handed': 'D35E.TwoWeaponTwoHanded',
  'main-offhand-light': 'D35E.TwoWeaponMainOffhandLight',
  'main-offhand-normal': 'D35E.TwoWeaponMainOffhandNormal',
  'offhand-light': 'D35E.TwoWeaponOffhandLight',
  'offhand-normal': 'D35E.TwoWeaponOffhandNormal',
};

D35E.spellcastingType = {
  'none': 'D35E.None',
  'arcane': 'D35E.Arcane',
  'divine': 'D35E.Divine',
  'psionic': 'D35E.Psionic',
  'other': 'D35E.Other',
};

D35E.combatChangeType = {
  'all': 'D35E.All',
  'attack': 'D35E.Attack',
  'attackOptional': 'D35E.AttackOptional',
  'spell': 'D35E.Spell',
  'spellOptional': 'D35E.SpellOptional',
  'defense': 'D35E.Defense',
  'defenseOptional': 'D35E.DefenseOptional',
  'savingThrow': 'D35E.SavingThrow',
  'savingThrowOptional': 'D35E.SavingThrowOptional',
  'grapple': 'D35E.CMB',
  'grappleOptional': 'D35E.CMBOptional',
  'skill': 'D35E.Skills',
  'skillOptional': 'D35E.SkillsOptional',
};

CONFIG.Combat.initiative.decimals = 2;

// Static conditional modifier targets
D35E.conditionalTargets = {
  attack: {
    _label: "D35E.AttackRollPlural",
    allAttack: "D35E.All",
  },
  damage: {
    _label: "D35E.Damage",
    allDamage: "D35E.All",
  },
  effect: {
    _label: "D35E.Effects",
  },
  misc: {
    _label: "D35E.MiscShort",
  },
};

D35E.damageTypes = {
  'energy': 'D35E.Energy',
  'type': 'D35E.BaseDamage'
};

D35E.savingThrowTypes = {
  'willhalf': 'D35E.STWillHalf',
  'willnegates': 'D35E.STWillNegates',
  'willpartial': 'D35E.STWillPartial',
  'reflexhalf': 'D35E.STReflexHalf',
  'reflexnegates': 'D35E.STReflexNegates',
  'reflexpartial': 'D35E.STReflexPartial',
  'fortitudehalf': 'D35E.STFortitudeHalf',
  'fortitudenegates': 'D35E.STFortitudeNegates',
  'fortitudepartial': 'D35E.STFortitudePartial',
};

D35E.requirements = {
  'generic': 'D35E.RequirementGeneric',
  'bab': 'D35E.BAB',
  'feat': 'D35E.Feat',
  "str": "D35E.AbilityStr",
  "dex": "D35E.AbilityDex",
  "con": "D35E.AbilityCon",
  "int": "D35E.AbilityInt",
  "wis": "D35E.AbilityWis",
  "cha": "D35E.AbilityCha"
}

D35E.senses = {
  "blindsight": "D35E.SenseBlindsight",
  "darkvision": "D35E.SenseDarkvision",
  "tremorsense": "D35E.SenseTremorsense",
  "truesight": "D35E.SenseTruesight"
};




