export class Roll35e extends Roll {
    static get name() {
        return "Roll";
    }

    static safeRoll(formula, data = {}, context, options = { suppressError: false }) {
        let roll;
        try {
            roll = this.create(formula, data).evaluate({async: false});
        } catch (err) {
            roll = this.create("0", data).evaluate({async: false});
            roll.err = err;
        }
        if (roll.warning) roll.err = Error("This formula had a value replaced with null.");
        if (roll.err) {
            if (context && !options.suppressError) console.error(context, roll.err);
            else if (CONFIG.debug.roll) console.error(roll.err);
        }
        return roll;
    }

    static parse(formula, data) {
        // Step 0: PreProcess formula
        formula = Roll35e._preProcessDiceFormula(formula, data)

        // Step 1: Replace formula data and remove all spaces
        let replaced = this.replaceFormulaData(formula, data, {missing: "0"});

        // Step 2: Split outer-most parenthetical groups
        let terms = this._splitParentheses(replaced);

        // Step 3: Further split outer-most dice pool groups
        terms = terms.reduce((arr, term) => {
            if ( typeof term === "string" ) arr = arr.concat(this._splitPools(term));
            else arr.push(term);
            return arr;
        }, []);

        // Step 4: Further split string terms on arithmetic operators
        terms = terms.reduce((arr, term) => {
            if ( typeof term === "string" ) arr = arr.concat(this._splitOperators(term));
            else arr.push(term);
            return arr;
        }, []);

        // Step 5: Classify all remaining strings
        terms = terms.map(t => this._classifyStringTerm(t));
        return terms;
    }

    static replaceFormulaData(formula, data, {missing, warn=false}={}) {
        let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
        return formula.replace(dataRgx, (match, term) => {
            let value = foundry.utils.getProperty(data, term);
            if ( value === null || value === undefined ) {
                if ( warn && ui.notifications ) ui.notifications.warn(game.i18n.format("DICE.WarnMissingData", {match}));
                return (missing !== undefined) ? String(missing) : match;
            }
            return String(value).trim();
        });
    }



    // _identifyTerms(formula, { step = 0 } = {}) {
    //     if (typeof formula !== "string") throw new Error("The formula provided to a Roll instance must be a string");
    //     formula = this.constructor._preProcessDiceFormula(formula, this.data);
    //     var warned;
    //
    //     // Step 1 - Update the Roll formula using provided data
    //     [formula, warned] = this.constructor.replaceFormulaData(formula, this.data, { missing: "0", warn: false });
    //     if (warned) this.warning = true;
    //
    //     // Step 2 - identify separate parenthetical terms
    //     let terms = this._splitParentheticalTerms(formula);
    //
    //     // Step 3 - expand pooled terms
    //     terms = this._splitPooledTerms(terms);
    //
    //     // Step 4 - expand remaining arithmetic terms
    //     terms = this._splitDiceTerms(terms, step);
    //
    //     // Step 4.5 - Strip non-functional term flavor text
    //     terms = terms.map((t) => {
    //         if (typeof t !== "string") return t;
    //         const stripped = t.replace(/\s*\[.*\]\s*/, ""),
    //             num = /\D/.test(stripped) ? NaN : parseFloat(stripped);
    //         if (isNaN(num)) return stripped;
    //         else return num;
    //     });
    //
    //     // Step 5 - clean and de-dupe terms
    //     terms = this.constructor.cleanTerms(terms);
    //     return terms;
    // }

    // static _splitParentheses(formula) {
    //     // Augment parentheses with semicolons and split into terms
    //     const split = formula.replace(/\(/g, ";(;").replace(/\)/g, ";);");
    //
    //     // Match outer-parenthetical groups
    //     let nOpen = 0;
    //     const terms = split.split(";").reduce((arr, t, i, terms) => {
    //         if (t === "") return arr;
    //
    //         // Identify whether the left-parentheses opens a math function
    //         let mathFn = false;
    //         if (t === "(") {
    //             const fn = terms[i - 1].match(/(?:\s)?([A-z0-9]+)$/);
    //             mathFn = fn && !!RollPF.MATH_PROXY[fn[1]];
    //         }
    //
    //         // Combine terms using open parentheses and math expressions
    //         if (nOpen > 0 || mathFn) arr[arr.length - 1] += t;
    //         else arr.push(t);
    //
    //         // Increment the count
    //         if (t === "(") nOpen++;
    //         else if (t === ")" && nOpen > 0) nOpen--;
    //         return arr;
    //     }, []);
    //
    //     // Close any un-closed parentheses
    //     for (let i = 0; i < nOpen; i++) terms[terms.length - 1] += ")";
    //
    //     // Substitute parenthetical dice rolls groups to inner Roll objects
    //     return terms.reduce((terms, term) => {
    //         const prior = terms.length ? terms[terms.length - 1] : null;
    //         if (term[0] === "(") {
    //             // Handle inner Roll parenthetical groups
    //             if (/[dD]/.test(term)) {
    //                 terms.push(RollPF.fromTerm(term, this.data));
    //                 return terms;
    //             }
    //
    //             // Evaluate arithmetic-only parenthetical groups
    //             term = this._safeEval(term);
    //             /* Changed functionality */
    //             /* Allow null/string/true/false as it used to be and crash on undefined */
    //             if (typeof term !== "undefined" && typeof term !== "number") term += "";
    //             else term = Number.isInteger(term) ? term : term.toFixed(2);
    //             /* End changed functionality */
    //
    //             // Continue wrapping math functions
    //             const priorMath = prior && prior.split(" ").pop() in Math;
    //             if (priorMath) term = `(${term})`;
    //         }
    //
    //         // Append terms to to non-Rolls
    //         if (prior !== null && !(prior instanceof Roll)) terms[terms.length - 1] += term;
    //         else terms.push(term);
    //         return terms;
    //     }, []);
    // }
    //
    // static replaceFormulaData(formula, data, { missing, warn = false }) {
    //     let dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
    //     var warned = false;
    //     return [
    //         formula.replace(dataRgx, (match, term) => {
    //             let value = getProperty(data, term);
    //             if (value === undefined) {
    //                 if (warn) ui.notifications.warn(game.i18n.format("DICE.WarnMissingData", { match }));
    //                 warned = true;
    //                 return missing !== undefined ? String(missing) : match;
    //             }
    //             return String(value).trim();
    //         }),
    //         warned,
    //     ];
    // }

    static _preProcessDiceFormula(formula, data = {}) {
        function _fillTemplate(templateString, templateVars){
            if (templateString.indexOf('$') !== -1)
                try {
                    return new Function("return `" + templateString + "`;").call(templateVars);
                } catch (err) {
                    ui.notifications.warn(game.i18n.format("DICE.WarnMissingData", {templateString}));
                    return  "0";
                }
            else
                return formula;
        }
        formula = _fillTemplate(formula, data)

        // Replace parentheses with semicolons to use for splitting
        let toSplit = formula
            .replace(/([A-z]+)?\(/g, (match, prefix) => {
                return prefix in game.D35E.rollPreProcess || prefix in Math ? `;${prefix};(;` : ";(;";
            })
            .replace(/\)/g, ";);");
        let terms = toSplit.split(";");

        // Match parenthetical groups
        let nOpen = 0,
            nOpenPreProcess = [];
        terms = terms.reduce((arr, t) => {
            // Handle cases where the prior term is a math function
            const beginPreProcessFn = t[0] === "(" && arr[arr.length - 1] in game.D35E.rollPreProcess;
            if (beginPreProcessFn) nOpenPreProcess.push([arr.length - 1, nOpen]);
            const beginMathFn = t[0] === "(" && arr[arr.length - 1] in Math;
            if (beginMathFn && nOpenPreProcess.length > 0) nOpenPreProcess.push([arr.length - 1, nOpen]);

            // Add terms to the array
            arr.push(t);

            // Increment the number of open parentheses
            if (t === "(") nOpen++;
            if (nOpen > 0 && t === ")") {
                nOpen--;
                for (let a = 0; a < nOpenPreProcess.length; a++) {
                    let obj = nOpenPreProcess[a];
                    // End pre process function
                    if (obj[1] === nOpen) {
                        const sliceLen = arr.length - obj[0];
                        let fnData = arr.splice(obj[0], sliceLen),
                            fn = fnData[0];
                        let fnParams = fnData
                            .slice(2, -1)
                            .reduce((cur, s) => {
                                cur.push(...s.split(/\s*,\s*/));
                                return cur;
                            }, [])
                            .map((o) => {
                                return Roll35e.safeRoll(o, data).total;
                            })
                            .filter((o) => o !== "" && o != null);
                        if (fn in Math) {
                            arr.push(Math[fn](...fnParams).toString());
                        } else {
                            arr.push(game.D35E.rollPreProcess[fn](...fnParams).toString());
                        }

                        nOpenPreProcess.splice(a, 1);
                        a--;
                    }
                }
            }
            return arr;
        }, []);

        return terms.join("");
    }

    async _evaluate({minimize=false, maximize=false}={}) {

        // Step 1 - Replace intermediate terms with evaluated numbers
        const intermediate = [];
        for ( let term of this.terms ) {
            if ( !(term instanceof RollTerm) ) {
                throw new Error("Roll evaluation encountered an invalid term which was not a RollTerm instance");
            }
            if ( term.isIntermediate ) {
                await term.evaluate({minimize, maximize, async: true});
                this._dice = this._dice.concat(term.dice);
                term = new NumericTerm({number: term.total, options: term.options});
            }
            intermediate.push(term);
        }
        this.terms = intermediate;

        // Step 2 - Simplify remaining terms
        this.terms = this.constructor.simplifyTerms(this.terms);

        // Step 3 - Evaluate remaining terms
        for ( let term of this.terms ) {
            if ( !term._evaluated && !(term instanceof StringTerm)) await term.evaluate({minimize, maximize, async: true});
        }

        // Step 4 - Evaluate the final expression
        this._total = this._evaluateTotal();
        return this;
    }

    _evaluateSync({minimize=false, maximize=false}={}) {

        // Step 1 - Replace intermediate terms with evaluated numbers
        this.terms = this.terms.map(term => {
            if ( !(term instanceof RollTerm) ) {
                throw new Error("Roll evaluation encountered an invalid term which was not a RollTerm instance");
            }
            if ( term.isIntermediate ) {
                term.evaluate({minimize, maximize, async: false});
                this._dice = this._dice.concat(term.dice);
                return new NumericTerm({number: term.total, options: term.options});
            }
            return term;
        });

        // Step 2 - Simplify remaining terms
        this.terms = this.constructor.simplifyTerms(this.terms);

        // Step 3 - Evaluate remaining terms
        for ( let term of this.terms ) {
            if ( !term._evaluated && !(term instanceof StringTerm)) term.evaluate({minimize, maximize, async: false});
        }

        // Step 4 - Evaluate the final expression
        this._total = this._evaluateTotal();
        return this;
    }

    roll() {
        return super.roll({async: false});
    }

    rollSync() {
        return super.roll({async: false});
    }
}


