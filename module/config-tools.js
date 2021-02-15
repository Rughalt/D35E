export const applyConfigModifications = function () {
    // Translate currency
    let currencyNames = game.settings.get("D35E", "currencyNames").split(",");
    CONFIG.D35E.currencies.pp = game.i18n.localize(currencyNames[0] || "D35E.CurrencyPP")
    CONFIG.D35E.currencies.gp = game.i18n.localize(currencyNames[1] || "D35E.CurrencyGP")
    CONFIG.D35E.currencies.sp = game.i18n.localize(currencyNames[2] || "D35E.CurrencySP")
    CONFIG.D35E.currencies.cp = game.i18n.localize(currencyNames[3] || "D35E.CurrencyCP")
}