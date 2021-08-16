export class LevelUpDataDialog extends FormApplication {
    constructor(...args) {
        super(...args);
        //console.log('D35E | Level Up Windows data', this.object.data)
        this.actor = this.object.data;
        this.levelUpId = this.options.id;
        this.levelUpData = this.actor.data.details.levelUpData.find(a => a.id === this.levelUpId);
        //console.log('ludid',this.levelUpId,this.levelUpData, this.options.skillset)
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "level-up-data",
            classes: ["D35E", "entry", "level-up-data"],
            title: "Level Data",
            template: "systems/D35E/templates/apps/level-up-data.html",
            width: 840,
            height: "auto",
            closeOnSubmit: false,
            submitOnClose: false,
        });
    }

    get attribute() {
        return this.options.name;
    }

    getData() {
        let skillset = {}
        Object.keys(this.options.skillset.all.skills).forEach(s => {
            skillset[s] = {
                rank: this.levelUpData.skills[s] !== undefined ? this.levelUpData.skills[s].rank : 0,
                name: this.options.skillset.all.skills[s].name,
                label: this.options.skillset.all.skills[s].label,
                arbitrary: this.options.skillset.all.skills[s].arbitrary,
                custom: this.options.skillset.all.skills[s].custom,
                baseRank: this.options.skillset.all.skills[s].rank - (this.levelUpData.skills[s] !== undefined ? (this.levelUpData.skills[s].cls ? this.levelUpData.skills[s].rank : this.levelUpData.skills[s].rank/2) : 0),
                rt: this.options.skillset.all.skills[s].rt,
                cs: this.options.skillset.all.skills[s].cs,
                subSkills: {}
            }

            Object.keys(this.options.skillset.all.skills[s]?.subSkills || []).forEach(sb => {
                skillset[s].subSkills[sb] = {
                    rank: (this.levelUpData.skills[s] !== undefined && this.levelUpData.skills[s].subskills[sb] !== undefined) ? this.levelUpData.skills[s].subskills[sb].rank : 0,
                    name: this.options.skillset.all.skills[s].subSkills[sb].name,
                    label: this.options.skillset.all.skills[s].subSkills[sb].label,
                    arbitrary: this.options.skillset.all.skills[s].subSkills[sb].arbitrary,
                    custom: this.options.skillset.all.skills[s].subSkills[sb].custom,
                    baseRank: this.options.skillset.all.skills[s].subSkills[sb].rank - ((this.levelUpData.skills[s] !== undefined && this.levelUpData.skills[s].subskills[sb] !== undefined) ? (this.levelUpData.skills[s].subskills[sb].cls ? this.levelUpData.skills[s].subskills[sb].rank : this.levelUpData.skills[s].subskills[sb].rank/2) : 0),
                    rt: this.options.skillset.all.skills[s].rt,
                    cs: this.options.skillset.all.skills[s].cs,
                }
            })
        })
        let classes = this.actor.items.filter(o => o.type === "class" && getProperty(o.data, "classType") !== "racial").sort((a, b) => {
            return a.sort - b.sort;
        })
        let data = {
            actor: this.actor,
            classes: classes,
            classesJson: JSON.stringify(classes.map(_c => { return {id: _c._id, classSkills: _c.data.data.classSkills}})),
            level: this.actor.data.details.levelUpData.findIndex(a => a.id === this.levelUpId) + 1,
            totalLevel: this.actor.data.details.level.available,
            skillset: skillset,
            maxSkillRank: this.actor.data.details.level.available + 3,
            levelUpData: this.levelUpData,
            bonusSkillPoints: this.actor.data?.counters?.bonusSkillPoints?.value || 0,
            config: CONFIG.D35E}
        return data
    }

    activateListeners(html) {
        html.find('button[type="submit"]').click(this._submitAndClose.bind(this));

        html.find('textarea').change(this._onEntryChange.bind(this));
    }

    async _onEntryChange(event) {
        const a = event.currentTarget;
    }

    async _updateObject(event, formData) {
        const updateData = {};
        let classId = formData['class'];
        let hp = parseInt(formData['hp'] || 0);
        //console.log('formData',formData)
        if (classId !== "") {


            let _class = this.actor.items.find(cls => cls._id === classId)
            let data = duplicate(this.actor.data.details.levelUpData);
            data.forEach(a => {
                if (a.id === this.levelUpId) {
                    a.class = _class.name;
                    a.classImage = _class.img;
                    a.classId = _class._id;
                    a.hp = hp;
                    Object.keys(formData).forEach(s => {
                        let key = s.split(".");
                        if (key[0] === "skills" && key.length === 3) {
                            if (a.skills[key[1]] === undefined) {
                                a.skills[key[1]] = {rank: 0, cls: _class.data.data.classSkills[key[1]]}
                            }
                            a.skills[key[1]].cls = _class.data.data.classSkills[key[1]]
                            a.skills[key[1]].rank = parseInt(formData[s])
                        }
                        if (key[0] === "skills" && key.length === 5) {
                            if (a.skills[key[1]] === undefined) {
                                a.skills[key[1]] = {subskills: {}}
                            }
                            if (a.skills[key[1]].subskills[key[3]] === undefined) {
                                a.skills[key[1]].subskills[key[3]] = {rank: 0, cls: _class.data.data.classSkills[key[1]]}
                            }
                            a.skills[key[1]].subskills[key[3]].cls = _class.data.data.classSkills[key[1]]
                            a.skills[key[1]].subskills[key[3]].rank = parseInt(formData[s])
                        }
                    })
                }
            })
            //console.log(`D35E | Updating Level Data | ${classId} | ${this.levelUpId}`)
            updateData[`data.details.levelUpData`] = data;

            const classes = this.actor.items.filter(o => o.type === "class" && getProperty(o.data, "classType") !== "racial").sort((a, b) => {
                return a.sort - b.sort;
            });

            let classLevels = new Map()
            let classHP = new Map()
            // Iterate over all levl ups
            data.forEach(lud => {
                if (lud.classId === null || lud.classId === "") return;
                let _class = this.actor.items.find(cls => cls._id === lud.classId)
                if (_class === undefined) return;
                if (!classLevels.has(_class._id))
                    classLevels.set(_class._id,0)
                classLevels.set(_class._id,classLevels.get(_class._id)+1)
                if (!classHP.has(_class._id))
                    classHP.set(_class._id,0)
                classHP.set(_class._id,classHP.get(_class._id) + (lud.hp || 0))
                Object.keys(lud.skills).forEach(s => {

                    if (lud.skills[s])
                        updateData[`data.skills.${s}.rank`] = (lud.skills[s].rank || 0) * (lud.skills[s].cls ? 1 : 0.5) + (updateData[`data.skills.${s}.rank`] || 0);
                    if (lud.skills[s].subskills) {
                        Object.keys(lud.skills[s].subskills).forEach(sb => {
                            if (lud.skills[s].subskills && lud.skills[s].subskills[sb])
                                updateData[`data.skills.${s}.subSkills.${sb}.rank`] = lud.skills[s].subskills[sb].rank * (lud.skills[s].subskills[sb].cls ? 1 : 0.5) + (updateData[`data.skills.${s}.subSkills.${sb}.rank`] || 0);
                        })
                    }
                })
            })
            Object.keys(data[0].skills).forEach(s => {
                if (this.object.data.data.skills[s])
                    updateData[`data.skills.${s}.rank`] = Math.floor(updateData[`data.skills.${s}.rank`] || 0);
                if (data[0].skills[s].subskills) {
                    Object.keys(data[0].skills[s].subskills).forEach(sb => {
                        if (this.object.data.data.skills[s].subskills && this.object.data.data.skills[s].subskills[sb])
                            updateData[`data.skills.${s}.subSkills.${sb}.rank`] = Math.floor(updateData[`data.skills.${s}.subSkills.${sb}.rank`] || 0);
                    })
                }
            })
            for (var __class of classes) {
                if (__class.data.classType === "racial") continue;
                let itemUpdateData = {}
                itemUpdateData["_id"] = __class._id;
                itemUpdateData["data.levels"] = classLevels.get(__class._id) || 0;
                itemUpdateData["data.hp"] = classHP.get(__class._id) || 0;
                await this.object.updateOwnedItem(itemUpdateData,{stopUpdates:true});
            }

        }
        return this.object.update(updateData);
    }

    async _submitAndClose(event) {
        event.preventDefault();
        await this._onSubmit(event);
        this.close();
    }
}
