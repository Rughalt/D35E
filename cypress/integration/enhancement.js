describe('The Home Page', () => {
    before(() => {
        cy.visit('http://localhost:30000/game') // change URL to match your dev URL
        cy.get('[name="userid"]').select('VIfT2pClvTXfstmc')

        cy.get('[data-action="join"]').click()
    })

    it('successfully loads', () => {
        cy.visit('http://localhost:30000/game') // change URL to match your dev URL
        cy.wait(2000)
    })

    it('opens enhanacement compendium', () => {
        cy.get('.notification > .close').click({multiple: true})
        cy.get('[title="Compendium Packs"] > .fas').click()
        cy.get('[data-pack="D35E.enhancements"] > .pack-title > a').click()
    })

    it('opens weapon compendium and imports weapon', () => {
        cy.get('[title="Compendium Packs"] > .fas').click()
        cy.get('[data-pack="D35E.weapons-and-ammo"] > .pack-title > a').click()
        cy.get('[data-entry-id="KtgSPHGqIRTwhwZM"] > .entry-name').rightclick()
        cy.get('.context-items > :nth-child(1)').click()
        cy.get('nav[data-group="primary"] > [data-tab="enhancements"]').click()
        cy.get('#app-18 > .window-header > .window-title').click({force: true})
        cy.get('#app-18 > .window-header > .header-button').click({force: true})
        cy.get('#app-17 > .window-header > .window-title').click({force: true})

        cy.get('[data-entry-id="Ng5AlRupmkMOgqQi"] > .entry-name > a').dragTo('.inventory-list', { smooth: true })

    })
})