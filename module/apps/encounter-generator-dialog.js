export class EncounterGeneratorDialog extends FormApplication {
    constructor(...args) {
        super(...args);

    }

    //Window option stuff
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "encounter-generator",
            title: "Encounter Generator",
            template: "systems/D35E/templates/apps/encounter-generator-dialog.html",
            width: "auto",
            height: "auto",
            closeOnSubmit: false,
            submitOnClose: false,
            classes: ["dialog auto-height-dialog encounter-roller"]
        });
    };

    loadCompendium() {//is the Bestiary compendium loaded?, No? Load it
        if (game.D35E.CompendiumDirectoryPF.browser.compendiums.bestiary._data.loaded == false) {
            ui.notifications.info("Loading Monster Compendiums for the first time...")
            game.D35E.CompendiumDirectoryPF.browser.compendiums.bestiary.loadData()
        }
    }
    async getCompendiumTables(){
        let compendium;
        let grabbedTable  = new Array;
        let grabbedTables = new Array;
        const compendiums = [...game.packs.values()]
        async function compendiumTables(name){
            const pack = game.packs.get("D35E.roll-tables");
            const index = await pack.getIndex();
            const idTable = index.find(i => i.name === `${name}`);
            const table = await pack.getDocument(idTable._id);
            return table;
        }
        compendium = await compendiums.find(c => c.metadata.name === 'roll-tables').getIndex()
        for(const item of compendium){
            grabbedTable = await compendiumTables(item.name)
            grabbedTables.push(grabbedTable)
        }
        return grabbedTables;
    };

    async getTables() {//What Roll tables are our options?
        const grabbedTables = await this.getCompendiumTables();
        let tables = grabbedTables
        let tableArray = new Array
        for (let table of tables) {
            //this is the data I want from the roll tables
            tableArray.push({id: table.data._id, name: table.data.name})
        }
        return tableArray
    };

    //function to calcutlate the EL
    funcELCalc(monsterArray) {

        //this function converts CR to (CR/2)^2 so we can combine all the numbers then bring them back down with log2*2
        function crConvert(arr) {
            return arr.map(function (x) {
                if (x > 2) {
                    return Math.pow(2, (x) / 2);
                } else {
                    return (x);
                }
            })
        }

        //this is just to collapse the array together with .reduce to combine all the CR's and then we can log2*2 them
        const add = (a, b) => a + b

        //crArray is all the monsters cr's in an array
        let crArray = new Array

        //take the CR from monsters in monsterArray
        let targets = monsterArray
        for (let target of targets) {
            crArray.push(target.cr)
        }

        //take the CR Array and convert them to (CR/2)^2 so they may be added together
        let crConverted = crConvert(crArray);

        //log2(of all converted CRs added together)*2
        let EL = Math.round(Math.log2(crConverted.reduce(add)) * 2)
        return EL
    };

//Function to get the monsters
    async getMonsters() {
        $("#putMonstersHere").empty()
        //declare stuff
        const grabbedTables = await this.getCompendiumTables();
        let EL = 0
        let monsterArray = new Array
        let targetEL = parseInt(document.getElementById('ELTarget').value)
        let val = document.getElementById('choicesCompendium').value
        let limit = 1000
        let j = 0
        let breakOut = false
        if (grabbedTables.find(t => t.data._id === val).results.filter(result => result.data.type != 2) != 0) {
            console.log(grabbedTables.find(t => t.data._id === val).results);
            return ui.notifications.error("This Rolltable has Non-Creatures on it, Cannot roll!")
        }
        // Loop limit - total number of loops we want to do.
        while (j < limit) {
            if (breakOut) {
                break;
            } //this is to break out of the loop whenever we are done adding monsters
            //while the EL of generated encounter is less than target EL...
            if (EL < targetEL) {
                //Roll a monster from val(the target roll table)
                let testCount = 0
                let testLimit = 50
                let testELArray = new Array
                let testEL = new Array
                //Try to add a monster with valid CR 'testLimit' times
                while (testCount <= testLimit) {
                    let monsters = (await grabbedTables.find(t => t.data._id === val).roll()).results
                    testELArray = duplicate(monsterArray)
                    monsters.forEach(monster => {
                        let monsterCR = game.D35E.CompendiumDirectoryPF.browser.compendiums.bestiary.items.find(x => x.item._id === monster.resultId)
                        testELArray.push({
                            id: monster.resultId,
                            name: monster.text,
                            img: monster.img,
                            cr: monsterCR.item.data.details.cr,
                            HP: monsterCR.item.data.attributes.hp.max,
                            AC: monsterCR.item.data.attributes.ac.normal.total,
                            SPD: monsterCR.item.data.attributes.speed.land.base
                        })


                    })
                    //this checks the CR of what we want to add to the Array and if it goes over the EL target the user set
                    testEL = this.funcELCalc(testELArray)
                    testCount++
                    if (testCount == testLimit) {
                        breakOut = true
                        break; // We exit the loop - we are done
                    }
                    if (testEL <= targetEL) {
                        monsterArray = testELArray
                        break; // We break out from this loop because we added a monster
                    }
                }


                let countArray = countMonsters(monsterArray);
                var monsterData = {monsters: countArray}
                //call the EL calculation function defined earlier the monster array having all the CRs
                if (monsterArray === 0) {
                    return ui.notifications.error("No monsters could be rolled, is Target EL lower than lowest table CR??")
                }
                EL = this.funcELCalc(monsterArray)
            } else {
                break; // We exit the loop - we are done
            }

            j++
            if (j >= limit) {
                return ui.notifications.error("Tried to roll more than 1000 times!!! Please use a lower Target EL for this table!")
            }
        }

//Gotta count the monsters and combine all the duplicates into one result per ID, Otherwise display is mess
        function countMonsters(arr) {
            let flattened = monsterArray.reduce((a, b) => a.concat(b), []);
            let seen = new Set
            const filteredArr = arr.filter(el => {
                const duplicate = seen.has(el.id);
                seen.add(el.id);
                return !duplicate;
            })
            let counts = flattened.reduce(                                       //count each attack in arrays to compare to the number of actors selected later
                (map, {id}) => map.set(id, (map.get(id) || 0) + 1), new Map()
            );


//shove it all together Monsters name and CR + How many we found
            let countArray = new Array
            let i;
            for (let [key, value] of counts) {
                for (i of filteredArr) {
                    if (i.id === key) {
                        countArray.push({
                            id: i.id,
                            count: value,
                            name: i.name,
                            cr: i.cr,
                            img: i.img,
                            AC: i.AC,
                            HP: i.HP,
                            SPD: i.SPD
                        })


                    }
                }
            }
            return countArray
        };

        async function makeMonsters() {//add all the monster data to the Encounter Gen window (in the form of a pretty little template)
            var newMonster = await renderTemplate("systems/D35E/templates/apps/encounter-generator-template.html", monsterData);
            $("#putMonstersHere").append(newMonster);
        };
        makeMonsters();
//This is so the EL never shows as a negative number or something silly cause of CR 1/2 and below
        let ELText = Math.max(1, EL)

//Push Result EL to Dialog box html
        $("#ELGoesHere").text(ELText)
        $(".encounter-block").show()
    }

    async getData() {//Load the compendium and get those tables to display!
        this.loadCompendium()
        let data = {tables: await this.getTables()}

        return data
    };

    activateListeners(html) {//This makes the button clickable ;D
        // Submit button
        html.find(".MonsterButton").click(this.getMonsters.bind(this));

    }

}
