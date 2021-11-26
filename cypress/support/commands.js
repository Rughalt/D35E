// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

const getCoords = ($el) => {
    const domRect = $el[0].getBoundingClientRect()
    const coords = { x: domRect.left + (domRect.width / 2 || 0), y: domRect.top + (domRect.height / 2 || 0) }

    return coords
}

const dragTo = (subject, to, opts) => {

    opts = Cypress._.defaults(opts, {
        // delay inbetween steps
        delay: 0,
        // interpolation between coords
        steps: 0,
        // >=10 steps
        smooth: false,
    })

    if (opts.smooth) {
        opts.steps = Math.max(opts.steps, 10)
    }

    const win = subject[0].ownerDocument.defaultView

    const elFromCoords = (coords) => win.document.elementFromPoint(coords.x, coords.y)
    const winMouseEvent = win.MouseEvent

    const send = (type, coords, el) => {

        el = el || elFromCoords(coords)

        el.dispatchEvent(
            new winMouseEvent(type, Object.assign({}, { clientX: coords.x, clientY: coords.y }, { bubbles: true, cancelable: true }))
        )
    }

    const toSel = to

    function drag (from, to, steps = 1) {

        const fromEl = elFromCoords(from)

        const _log = Cypress.log({
            $el: fromEl,
            name: 'drag to',
            message: toSel,
        })

        _log.snapshot('before', { next: 'after', at: 0 })

        _log.set({ coords: to })

        send('mouseover', from, fromEl)
        send('mousedown', from, fromEl)

        cy.then(() => {
            return Cypress.Promise.try(() => {

                if (steps > 0) {

                    const dx = (to.x - from.x) / steps
                    const dy = (to.y - from.y) / steps

                    return Cypress.Promise.map(Array(steps).fill(), (v, i) => {
                        i = steps - 1 - i

                        let _to = {
                            x: from.x + dx * (i),
                            y: from.y + dy * (i),
                        }

                        send('mousemove', _to, fromEl)

                        return Cypress.Promise.delay(opts.delay)

                    }, { concurrency: 1 })
                }
            })
                .then(() => {

                    send('mousemove', to, fromEl)
                    send('mouseover', to)
                    send('mousemove', to)
                    send('mouseup', to)
                    _log.snapshot('after', { at: 1 }).end()

                })

        })

    }

    const $el = subject
    const fromCoords = getCoords($el)
    const toCoords = getCoords(cy.$$(to))

    drag(fromCoords, toCoords, opts.steps)
}

Cypress.Commands.addAll(
    { prevSubject: 'element' },
    {
        dragTo,
    }
)