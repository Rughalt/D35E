import { ItemPF } from '../item/entity.js'
import {
	TreasureTable,
	GemsTable,
	ArtsTable,
	MagicItemTable,
	MundaneItemsTable,
	weaponsTable,
	meleeWeaponsAbilityTable,
	rangedWeaponsAbilityTable,
} from './treasureTables.js'

//#region utility functions
function log(message) {
	if (CONFIG.debug['treasure-gen']) {
		// eslint-disable-next-line no-console
		//console.log(message)
	}
}

function cleanObj(obj) {
	Object.keys(obj).forEach((key) => {
		if (obj[key] && typeof obj[key] === 'object') {
			cleanObj(obj[key])
		} else if (obj[key] === undefined) {
			delete obj[key]
		}
	})
	return obj
}

function execFunctions(obj) {
	for (let key in obj) {
		if (typeof obj[key] === 'object') {
			execFunctions(obj[key])
		} else if (typeof obj[key] === 'function') {
			obj[key] = obj[key]()
		}
	}
}

function times(x) {
	return [...Array(x).keys()]
}

function getItem(link) {
	let entity = null

	// Target 1 - Compendium Link
	if (link.includes('.')) {
		let parts = link.split('.')
		let id = parts.pop()
		let packId = parts.join('.')
		const pack = game.packs.get(packId)
		entity = id ? pack.getDocument(id) : null
	} // Target 2 - Item Link
	else {
		let id = link
		entity = id ? game.items.getDocument(id) : null
	}

	return entity
}

function rollDice(formula, enable3DDice = false) {
	let roll = new Roll(formula).roll()
	if (enable3DDice) {
		game.enable3DDice.showForRoll(roll)
	}
	return roll.total
}

function rollMoney(rollFormula, enable3DDice = false) {
	return rollDice(rollFormula, enable3DDice)
}

//#endregion

//TODO enable3DDice for the memes game.enable3DDice.showForRoll(roll)
export default class TreasureGenerator {
	constructor() {
		this._treasure = {
			cp: 0,
			sp: 0,
			gp: 0,
			pp: 0,
			items: [],
		}
		this._treasureErr = {
			cp: 0,
			sp: 0,
			gp: 0,
			pp: 0,
			items: [],
		}
		this._rolls = []
	}

	get treasure() {
		return this._treasure
	}

	toChat(treasure = this._treasure) {
		var TreasureString = '<div class="D35E chat-card item-card">'
		//#region gold section
		if (treasure.cp + treasure.sp + treasure.gp + treasure.pp > 0) {
			TreasureString += `<header class="card-header flexrow">
	<img src="systems/D35E/icons/items/inventory/Loot_129.png" title="Money" width="36" height="36">
	<h3 class="item-name">Money</h3>
	</header> <div><p>`
			if (treasure.cp > 0) {
				TreasureString +=
					'<span class="fontstyle0">cp: ' +
					treasure.cp +
					'</span><br>'
			}
			if (treasure.sp > 0) {
				TreasureString +=
					'<span class="fontstyle0">sp: ' +
					treasure.sp +
					'</span><br>'
			}
			if (treasure.gp > 0) {
				TreasureString +=
					'<span class="fontstyle0">gp: ' +
					treasure.gp +
					'</span><br>'
			}
			if (treasure.pp > 0) {
				TreasureString +=
					'<span class="fontstyle0">pp: ' + treasure.pp + '<br>'
			}

			TreasureString +=
				'</p></div><hr><span class="fontstyle0"> total value = ' +
				Math.floor(
					treasure.cp / 100 +
						treasure.sp / 10 +
						treasure.gp +
						treasure.pp * 10
				) +
				' gp</span>'
		}
		//#endregion

		//#region items section
		if (treasure.items.length > 0) {
			TreasureString += `<header class="card-header flexrow">
	<img src="systems/D35E/icons/items/inventory/Loot_102.png" title="Items" width="36" height="36">
	<h3 class="item-name">Items</h3>
	</header> <div class="card-content"><p>`

			treasure.items.forEach((item) => {
				TreasureString += `<span class="fontstyle0">${
					(item.amount > 1 && item.amount + 'x ') || ''
				}${item.type} ${
					(item.enhancement > 0 && '+' + item.enhancement) || ''
				} `
				if (item.ability.length > 0) {
					TreasureString += `[${item.ability
						.map((it) => it.itemType)
						.join(', ')}]`
				}
				TreasureString += ` (${item.value} gp) </span><br style="font-style:normal;font-variant:normal;font-weight:normal;letter-spacing:normal;line-height:normal;orphans:2;text-align:-webkit-auto;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;-webkit-text-size-adjust:auto;-webkit-text-stroke-width:0px"><br>`
			})
			TreasureString += '</p></div>'
		}
		//#endregion
		TreasureString += '</div>'
		ChatMessage.create({ content: TreasureString })
	}

	async _makeItem(item) {
		if (item.id) {
			try {
				// //console.log("fetchin " + item.id);
				let _it = await getItem(item.id)
				let it = new ItemPF(_it.data, {temporary: true})
				delete it._id
				// //console.log(it);
				if (item.consumableType) {
					//TODO handle caster Level, not every item has it defined, others have it at 0 when not needed (been added automatically)
					await it.data.update({'data.quantity':item.amount})
					if (item.itemOverride) {
						execFunctions(item.itemOverride)	
						await it.data.update({...item.itemOverride.data})
					}
					let consumableItem = await ItemPF.toConsumable(
						it.data,
						item.consumableType
					)
					consumableItem = new ItemPF(consumableItem, {temporary: true})
					delete consumableItem._id
					if (consumableItem.data._id) {
						delete consumableItem.data._id
					}
					return consumableItem.data.toObject(false)
				} else if (item.ability.length > 0 || item.enhancement > 0) {
					let enhancements = []

					if (item.ability.length > 0) {
						for (let itemAbility of item.ability) {
							enhancements.push({
								id: itemAbility.id,
								enhancement: itemAbility.enhancementLevel,
							})
						}
					}

					if (item.enhancement > 0) {
						if (item.id.includes('armors-and-shields')) {
							enhancements.push({
								id: 'iOhtLsgtgmt2l9CM',
								enhancement: item.enhancement,
							})
						} else {
							enhancements.push({
								id: 'Ng5AlRupmkMOgqQi',
								enhancement: item.enhancement,
							})
						}
					}

					let _enhancements = it.data.data.enhancements || {}
					let _enhancementsItems =
						_enhancements.items || []
					for (let enhancement of enhancements) {
						let enhancementData = await it.addEnhancementFromCompendium(
							'D35E.enhancements',
							enhancement.id,
							enhancement.enhancement
						)
						_enhancementsItems.push(
							enhancementData['data.enhancements.items'].splice(
								-1
							)[0]
						)
					}

					await it.data.update({'data.enhancements':_enhancements, 'data.quantity':item.amount})
					if (item.itemOverride) {
						execFunctions(item.itemOverride)	
						await it.data.update({...item.itemOverride.data})
					}
					let _createdItem =it.data.toObject(false)
					

					return _createdItem
				} else {
					await it.data.update({'data.quantity':item.amount})
					if (item.itemOverride) {
						execFunctions(item.itemOverride)						
						await it.data.update({...item.itemOverride.data, 'name':item.itemOverride.data.data.identifiedName})
					}
					return it.data.toObject(false)
				}
			} catch (err) {
				console.error(`D35E | TREASURE | error fetching item ${item.type} - ${item.id}`)
				console.error(err)
				console.error(this._rolls)
				this._treasureErr.items.push(item)
			}
		} else {
			console.error(`D35E | TREASURE | no item generated for ${item.type}`)
			this._treasureErr.items.push(item)
		}
	}

	// toItemPfArr() {
	//   let promises = [];

	//   //console.log(this._treasure.items)
	//   for (let item of this._treasure.items) {
	//     promises.push(this._makeItem(item));
	//   }

	//   return Promise.all(promises);
	// }

	async *toItemPfArr() {
		for (let item of this._treasure.items) {
			yield await this._makeItem(item)
		}
	}

	// toPuSContainer(position = { gridX: 0, gridY: 0 }) {
	//   let pikUpStiXModule = game.modules.get("pick-up-stix");
	//   var treasureErr = {
	//     cp: 0,
	//     sp: 0,
	//     gp: 0,
	//     pp: 0,
	//     gems: [],
	//     arts: [],
	//     items: [],
	//   };

	//   this.toItemPfArr()
	//     .then((itemsObjects) => {
	//       pikUpStiXModule.apis.makeContainer(
	//         itemsObjects.filter((el) => el !== undefined),
	//         {
	//           cp: this._treasure.cp,
	//           sp: this._treasure.sp,
	//           gp: this._treasure.gp,
	//           pp: this._treasure.pp,
	//         },
	//         position
	//       );
	//     })
	//     .then(() => {
	//       if (treasureErr.items.length > 0) {
	//         this.treasureToChat(this._treasureErr);
	//       }
	//     });
	// }

	rollItem(
		table,
		grade,
		prefix = '',
		forceRolls = [],
		options,
		itemDamageType = []
	) {
		let magicItemRoll = rollDice('1d100', options.enable3DDice)
		if (forceRolls && forceRolls.length > 0) {
			magicItemRoll = forceRolls.shift()
		}

		let magicItemData = table.find(
			(r) =>
				r[grade + 'Min'] <= magicItemRoll &&
				r[grade + 'Max'] >= magicItemRoll
		)
		if (magicItemData === undefined) {
			//fallback for a table withoud minor-medium-major distinction
			magicItemData = table.find(
				(r) => r['Min'] <= magicItemRoll && r['Max'] >= magicItemRoll
			)
		} else {
			prefix = ''
		}

		this._rolls.push({
			roll: magicItemRoll,
			itemType: magicItemData?.itemType || 'undefined',
		})

		// console.debug(
		//   "magicItemRoll: " + magicItemRoll + " " + magicItemData.itemType
		// );
		let result = {
			value: 0,
			enhancement: 0,
			type: '',
			ability: [],
			valueBonus: 0,
		}
		let roll = {}
		let abilities = []
		try {
			switch (magicItemData.type) {
				case 'item':
					Object.assign(result, {
						type: (
							(prefix || '') +
							' ' +
							(magicItemData.itemType || '')
						).trim(),
						value: magicItemData.value || 0,
						table: magicItemData.table,
						id: magicItemData.id,
						itemOverride: magicItemData.itemOverride,
						amount: magicItemData.amount,
						consumableType: magicItemData.consumableType,
						casterLevel: magicItemData.casterLevel,
						damageType: magicItemData.damageType,
					})
					if (magicItemData.roll && magicItemData.roll !== '1d1') {
						let ItemAmount = rollDice(
							magicItemData.roll,
							options.enable3DDice
						)
						if (forceRolls && forceRolls.length > 0) {
							ItemAmount = forceRolls.shift()
						}
						result.amount = ItemAmount
					}
					if (magicItemData.valueRoll) {
						Object.assign(result, {
							value:
								result.value +
								rollDice(
									magicItemData.valueRoll,
									options.enable3DDice
								),
						})
					}
					return result
				case 'roll':
					roll = this.rollItem(
						magicItemData.table,
						grade,
						(
							(prefix || '') +
							' ' +
							(magicItemData.itemType || '')
						).trim(),
						forceRolls,
						options
					)
					Object.assign(result, roll)
					let valueBonus = 0
					if (roll.valueBonus && roll.valueBonus > 0) {
						valueBonus =
							(Math.pow(roll.enhancement + roll.valueBonus, 2) -
								Math.pow(roll.enhancement, 2)) *
							1000
						if (magicItemData.itemType === 'Weapons') {
							valueBonus *= 2
						}
					}

					if (magicItemData.valueRoll) {
						Object.assign(result, {
							value:
								result.value +
								rollDice(
									magicItemData.valueRoll,
									options.enable3DDice
								),
						})
					}

					Object.assign(result, {
						value:
							result.value +
							(magicItemData.value || 0) +
							valueBonus,
						enhancement:
							result.enhancement ||
							0 + magicItemData.enhancement ||
							0,
					})
					let extraOverride = {
						data: {
							data: {
								identified: options.identified,
								price: result.value,
								masterwork: options.masterwork,
							},
						},
					}

					if (result.itemOverride) {
						mergeObject(result.itemOverride, extraOverride)
					} else {
						result.itemOverride = extraOverride
					}

					if (options.overrideNames) {
						mergeObject(result.itemOverride, {
							data: {
								data: {
									identifiedName: result.type,
								},
							},
						})
					}

					if (magicItemData.itemOverride) {
						mergeObject(
							result.itemOverride,
							magicItemData.itemOverride
						)
					}

					if (magicItemData.casterLevel) {
						Object.assign(result, {
							casterLevel: magicItemData.casterLevel,
						})
					}

					return cleanObj(result)
				case 'ammunition':
					this.rollItem(
						magicItemData.table,
						grade,
						prefix,
						forceRolls,
						options
					)
					return this.rollItem(
						table,
						grade,
						prefix,
						forceRolls,
						options
					)
				case 'extraItem':
					let extraItem = {
						value: magicItemData.value,
						type: (
							(prefix || '') +
							' ' +
							(magicItemData.itemType || '')
						).trim(),
						amount: rollDice(
							magicItemData.roll,
							options.enable3DDice
						),
						ability: [],
						enhancement: 0,
						id: magicItemData.id,
					}
					extraItem.itemOverride = {
						data: {
							data: {
								price: Math.floor(
									extraItem.value / extraItem.amount
								),
								masterwork: options.masterwork,
							},
						},
					}
					this._treasure.items.push(extraItem)
					break
				case 'rollScroll':
					let amountFormula = ''
					switch (grade) {
						case 'minor':
							amountFormula = '1d3'
							break
						case 'medium':
							amountFormula = '1d4'
							break
						case 'major':
							amountFormula = '1d6'
							break
					}
					let scrollAmountRoll = rollDice(
						amountFormula,
						options.enable3DDice
					)
					if (forceRolls && forceRolls.length > 0) {
						scrollAmountRoll = forceRolls.shift()
					}

					times(scrollAmountRoll).forEach((step) => {
						let result2 = {
							value: 0,
							enhancement: 0,
							type: '',
							ability: [],
							valueBonus: 0,
						}
						roll = this.rollItem(
							magicItemData.table,
							grade,
							(
								(prefix || '') +
								' ' +
								(magicItemData.itemType || '')
							).trim(),
							forceRolls,
							options
						)
						Object.assign(result2, roll)

						if (step === 0) {
							result = cleanObj(result2)
						} else {
							this._treasure.items.push(cleanObj(result2))
						}
					})
					return result
					break
				case 'roll+':
					//item roll
					roll = this.rollItem(
						table,
						grade,
						prefix,
						forceRolls,
						options
					)

					//ability roll
					let abilityRoll = this.rollItem(
						roll.table,
						grade,
						'',
						forceRolls,
						options,
						roll.damageType
					)

					for (let ability of abilityRoll) {
						if (
							roll.ability.filter(
								(ab) => ab.itemType === ability.itemType
							).length === 0
						) {
							Object.assign(result, {
								value: result.value + ability.value,
								valueBonus:
									result.valueBonus + ability.enhancement,
							})
							abilities.push(ability)
						}
					}

					Object.assign(result, {
						value: result.value + roll.value,
						enhancement: result.enhancement + roll.enhancement,
						valueBonus: result.valueBonus + roll.valueBonus,
						type: ((prefix || '') + ' ' + (roll.type || '')).trim(),
						ability: JSON.parse(
							JSON.stringify(abilities.concat(roll.ability))
						),
						table: roll.table,
						id: roll.id,
						itemOverride: roll.itemOverride,
						amount: roll.amount,
					})

					return cleanObj(result)
				case 'ability++':
					roll = this.rollItem(
						table,
						grade,
						prefix,
						forceRolls,
						options,
						itemDamageType
					)

					for (let ability of roll) {
						if (
							abilities.filter(
								(ab) => ab.itemType === ability.itemType
							).length === 0
						) {
							abilities.push(ability)
						}
					}

					roll = this.rollItem(
						table,
						grade,
						prefix,
						forceRolls,
						options,
						itemDamageType
					)

					for (let ability of roll) {
						if (
							abilities.filter(
								(ab) => ab.itemType === ability.itemType
							).length === 0
						) {
							abilities.push(ability)
						}
					}
					return abilities
				case 'ability':
					let ret = {
						itemType: magicItemData.itemType,
						type: magicItemData.type,
						value: magicItemData.value,
						enhancement: magicItemData.enhancement,
						id: magicItemData.id,
						enhancementLevel: magicItemData.enhancementLevel,
						itemOverride: magicItemData.itemOverride,
					}

					if (magicItemData.table) {
						let {
							itemTypeExtra,
							idOverride,
							itemOverride,
						} = this.rollItem(
							magicItemData.table,
							grade,
							prefix,
							forceRolls,
							options
						)
						ret.itemType += ', ' + itemTypeExtra
						ret.id = idOverride
						ret.itemOverride = itemOverride //might be an issue if there were case in which both ability and extraItemDef(only used for typing bane ability) use it
					}

					if (
						magicItemData.damageTypeWhitelist &&
						itemDamageType.length > 0 &&
						magicItemData.damageTypeWhitelist.length > 0
					) {
						let allowed = false
						itemDamageType.forEach((dt) => {
							if (
								magicItemData.damageTypeWhitelist.includes(dt)
							) {
								allowed = true
							}
						})
						if (!allowed) {
							return this.rollItem(
								table,
								grade,
								prefix,
								forceRolls,
								options,
								itemDamageType
							)
						}
					}

					abilities.push(ret)
					return abilities
				case 'extraItemDef':
					return {
						itemTypeExtra: magicItemData.itemType,
						idOverride: magicItemData.id,
						itemOverride: magicItemData.itemOverride,
					}
			}
		} catch (err) {
			// console.error(magicItemData)
			err.message += ' ' + magicItemRoll
			throw err
		}
	}

	/**
	 *
	 * @param {Array} TreasureLevels Represents the monsters against which to run the generation algorithm e.g. [{
		cr = 1,
		moneyMultiplier = 1,
		goodsMultiplier = 1,
		itemsMultiplier = 1,
	}]
	 * @param {Object} Options e.g. { identified = false, tradeGoodsToGold = false, overrideNames = true, enable3DDice = false },
	 `identified` specifies wether magic items creted should be marked as identified by default, `tradeGoodsToGold` specifies
	 wether to make items for trade goods or directly add their gold value to the treasure, `overrideNames` specifies wether
	 to override the final item name with the name obtained from the tables (some items require it such as *Necklace of fireballs type II*
	 where the compendium item is *Necklace of fireballs* but there are 7 types), `enable3DDice` enables visual dice for the memes
	 * @param {Array} ItemRollFudge Overrides rolls maintaining array order, used for automated testing e.g. [1,5,5]
	 */
	makeTreasureFromCR(
		TreasureLevels,
		{
			identified = false,
			tradeGoodsToGold = false,
			overrideNames = true,
			enable3DDice = false,
		},
		ItemRollFudge = []
	) {
		TreasureLevels.forEach((TreasureLevel) => {
			let treasureRow =
				TreasureTable[
					Math.min(Math.max(Math.floor(TreasureLevel.cr), 1), 30) - 1
				]

			//#region Roll for money
			times(TreasureLevel.moneyMultiplier).forEach(() => {
				let moneyRoll = rollDice('1d100', enable3DDice)
				let moneyResult = treasureRow.money.find(
					(r) => r.Min <= moneyRoll && r.Max >= moneyRoll
				)

				if (moneyResult.type !== 'nothing') {
					this.treasure[moneyResult.type] += rollMoney(
						moneyResult.roll,
						enable3DDice
					)
				}
			})
			//#endregion

			//#region Roll for items
			times(TreasureLevel.itemsMultiplier).forEach(() => {
				let itemsRoll = rollDice('1d100', enable3DDice)
				if (ItemRollFudge.length > 0) {
					itemsRoll = ItemRollFudge.shift()
					// console.debug("fudged Dice roll = " + itemsRoll);
				}
				let itemsResult = treasureRow.items.find(
					(r) => r.Min <= itemsRoll && r.Max >= itemsRoll
				)
				let itemsNo = rollDice(itemsResult.roll, enable3DDice)
				times(itemsNo).forEach(() => {
					switch (itemsResult.type) {
						case 'nothing':
							break
						case 'mundane':
							try {
								this._addItem({
									...this.rollItem(
										MundaneItemsTable,
										itemsResult.type,
										'',
										ItemRollFudge,
										{
											identified: true,
											overrideNames: overrideNames,
										}
									),
									ability: [],
									enhancement: 0,
								})
							} catch (err) {
								err.message +=
									' --- ' + JSON.stringify(this._rolls)
								console.error(this._rolls)
								throw err
							}
							break
						case 'minor':
						case 'medium':
						case 'major':
							try {
								this._addItem(
									this.rollItem(
										MagicItemTable,
										itemsResult.type,
										'',
										ItemRollFudge,
										{
											identified: identified,
											// TODO are potions rings etc ok to be masterwork as well?
											masterwork: true,
											overrideNames: overrideNames,
										}
									)
								)
							} catch (err) {
								err.message +=
									' --- ' + JSON.stringify(this._rolls)
								console.error(this._rolls)
								throw err
							}

							break
					}
				})
			})

			if (treasureRow.extraItems) {
				let extraItemsNo = treasureRow.extraItems
				times(extraItemsNo).forEach(() => {
					try {
						this._addItem(
							this.rollItem(
								MagicItemTable,
								'major',
								'',
								ItemRollFudge,
								{
									identified: identified,
									// TODO are potions rings etc ok to be masterwork as well?
									masterwork: true,
									overrideNames: overrideNames,
								}
							)
						)
					} catch (err) {
						err.message += ' --- ' + JSON.stringify(this._rolls)
						console.error(this._rolls)
						throw err
					}
				})
			}
			//#endregion

			//#region Roll for goods
			times(TreasureLevel.goodsMultiplier).forEach(() => {
				let goodsRoll = rollDice('1d100', enable3DDice)
				let goodsResult = treasureRow.goods.find(
					(r) => r.Min <= goodsRoll && r.Max >= goodsRoll
				)
				let goodsNo = rollDice(goodsResult.roll, enable3DDice)
				times(goodsNo).forEach(() => {
					let goods = null
					switch (goodsResult.type) {
						case 'nothing':
							break
						case 'gems':
							goods = {
								...this.rollItem(GemsTable, 'mundane', '', [], {
									identified: true,
									overrideNames: overrideNames,
								}),
								ability: [],
								enhancement: 0,
							}
							break
						case 'arts':
							goods = {
								...this.rollItem(ArtsTable, 'mundane', '', [], {
									identified: true,
									overrideNames: overrideNames,
								}),
								ability: [],
								enhancement: 0,
							}
							break
					}
					if (goodsResult.type !== 'nothing') {
						if (tradeGoodsToGold) {
							this.treasure.gp += goods.value
						} else {
							this._addItem(goods)
						}
					}
				})
			})
			//#endregion
		})
		log(this.treasure)
		return this
	}

	_addItem(obj) {
		this.treasure.items.push(
			cleanObj({
				value: obj.value,
				type: obj.type,
				ability: obj.ability,
				enhancement: obj.enhancement,
				amount: obj.amount || 1,
				id: obj.id,
				itemOverride: obj.itemOverride,
				consumableType: obj.consumableType,
				casterLevel: obj.casterLevel,
			})
		)
	}

	genItems(
		noItems,
		table,
		itemType,
		prefixedRolls,
		options = {
			identified: true,
			masterwork: false,
			overrideNames: true,
		}
	) {
		times(noItems).forEach(() => {
			this._addItem({
				ability: [],
				enhancement: 0,
				...this.rollItem(
					table,
					itemType,
					'',
					JSON.parse(JSON.stringify(prefixedRolls)),
					options
				),
			})
		})
	}
}

//#region example

function getActorCrAndMultiplier(actor) {
	let cr = actor.data.data.details.cr
	//#region Options Validation
	// moneyMultiplier = Math.floor(Math.max(moneyMultiplier, 1))
	// goodsMultiplier = Math.floor(Math.max(goodsMultiplier, 1))
	// itemsMultiplier = Math.floor(Math.max(itemsMultiplier, 1))
	//#endregion
	//TODO fetch actual multiplier data
	return {
		cr: cr,
		moneyMultiplier: 1,
		goodsMultiplier: 1,
		itemsMultiplier: 1,
	}
}

function getSelectedNpcs() {
	return canvas.tokens.controlled.filter(
		(t) => game.actors.get(t.data.actorId).data.type === 'npc'
	)
}

/**
 * Treasure Generator Usage Example.
 * @param {Object} options e.g. { identified = false, tradeGoodsToGold = false, overrideNames = true }
 */
export function genTreasureFromSelectedNpcsCr(
	options = {
		identified: false,
		tradeGoodsToGold: false,
		overrideNames: true,
	}
) {
	if (getSelectedNpcs().length !== 0) {
		let TreasureLevels = []
		getSelectedNpcs().forEach((t) => {
			let actor = game.actors.get(t.data.actorId)
			let TreasureLevel = getActorCrAndMultiplier(actor)
			TreasureLevels.push(TreasureLevel)
		})
		let treasureGen = new TreasureGenerator()
		let treasure = treasureGen.makeTreasureFromCR(TreasureLevels, options)
			.treasure

		let pikUpStiXModule = game.modules.get('pick-up-stix')

		if (pikUpStiXModule?.active) {
			let treasurePosition = {
				gridX: getSelectedNpcs()[0].data.x,
				gridY:
					getSelectedNpcs()[0].data.y -
					getSelectedNpcs()[0].scene.data.grid,
			}
			treasureGen.toPuSContainer(treasurePosition)
		} else {
			treasureGen.toChat()
		}
		return treasure
	}
}

export async function genTreasureFromToken(
	token,
	options = {
		identified: false,
		tradeGoodsToGold: false,
		overrideNames: true,
	}
) {
	// //console.log("generating treasure for: ", token.name);
	let TreasureLevels = []
	let actor = token.actor
	let TreasureLevel = getActorCrAndMultiplier(actor)
	TreasureLevels.push(TreasureLevel)
	let treasureGen = new TreasureGenerator()
	let treasure = treasureGen.makeTreasureFromCR(TreasureLevels, options)
		.treasure

	// debug purposes
	// treasureGen.toChat();

	if (actor.hasPlayerOwner) {
		return
	}

	//restore original npc items items
	let itemsToDelete = token.actor.data.items
		.filter(
			(item) =>
				!game.actors
					.get(token.data.actorId)
					.data.items.map((it) => it._id)
					.includes(item._id)
		)
		.map((it) => it._id)
	//console.log('D35E |  Layer TOKEN', token)
	await token.actor.deleteEmbeddedEntity(
		'Item',
		Array.from(itemsToDelete),
		{ stopUpdates: true }
	)

	// //console.log("actor:", game.actors.get(token.data.actorId));
	// //console.log("items:", game.actors.get(token.data.actorId).data.items);

	//TODO adding items to actor, verify 0.8 compatibility


	let itemsToCreate = []
    for await (let it of treasureGen.toItemPfArr()) {
      if (it === null || it === undefined) continue;
      //console.log("item: ", item);
      itemsToCreate.push(it);
      
    }
    let createdItems = await canvas.tokens
        .get(token.data._id)
        .actor.createEmbeddedEntity("Item", itemsToCreate, { stopUpdates: true });
    for (let item of createdItems) {
      if (item.data.type === "weapon" || item.data.type === "equipment") {
        const updateData = {};
        let _enhancements = duplicate(
          getProperty(item.data, `data.enhancements.items`) || []
        );

        item.updateMagicItemName(updateData, _enhancements, true, true);
        item.updateMagicItemProperties(updateData, _enhancements, true);
        await item.update(updateData, { stopUpdates: true });
      }
    }

	await canvas.tokens.get(token.data._id).actor.update({
		'data.currency': {
			pp: treasure.pp,
			gp: treasure.gp,
			sp: treasure.sp,
			cp: treasure.cp,
		},
	})

	// //console.log("token after treasure gen:", canvas.tokens.get(token.data._id));
	// //console.log("treasure rolls:", treasureGen._rolls);
	return treasure
}

/**
 * Example for generating vendor merchandise, pass vendor and amount of items to generate,
 * it is incomplete, it's missing adding items to vendor inventory.
 * @param {Token} vendorToken
 * @param {int} noMundaneItems
 * @param {int} noMinorItems
 * @param {int} noMediumItems
 * @param {int} noMajorItems
 */
export function genWeaponSmithItems(
	vendorToken,
	noMundaneItems,
	noMinorItems,
	noMediumItems,
	noMajorItems
) {
	let treasureGen = new TreasureGenerator()

	treasureGen.genItems(noMundaneItems, MundaneItemsTable, 'mundane', [51])

	treasureGen.genItems(noMinorItems, weaponsTable, 'minor', [], {
		identified: true,
		masterwork: true,
		overrideNames: true,
	})

	treasureGen.genItems(noMediumItems, weaponsTable, 'medium', [], {
		identified: true,
		masterwork: true,
		overrideNames: true,
	})

	treasureGen.genItems(noMajorItems, weaponsTable, 'major', [], {
		identified: true,
		masterwork: true,
		overrideNames: true,
	})

	treasureGen
		.toItemPfArr()
		// eslint-disable-next-line no-unused-vars
		.then((items) => {
			//TODO add items to vendorToken
			vendorToken
		})
		.catch((err) => {
			throw err
		})
}

//#endregion
