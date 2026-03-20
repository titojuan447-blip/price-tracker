var config = require('../../config/config'),
    messages = require('../../public/lib/messages.js'),
    Plugin_ = require('../models/Plugin.js'),
    PriceRequester = require('../models/PriceRequester.js'),
    Streamer = require('../models/Streamer.js');

function BullionVaultPriceRequester(symbol, options) {
    PriceRequester.call(this, symbol, options);
}

BullionVaultPriceRequester.config = {
    exchange: 'bullionvault',
    symbol_map: { 
        "XAUUSD" : "AUXZU", // Símbolo correcto para Oro en USD
        "XAGUSD" : "AGXZU"  // Símbolo correcto para Plata en USD
    },
    // Usamos la URL que devuelve JSON directamente
    url_template: 'https://www.bullionvault.com/view_market_json.do?currency=USD'
};

BullionVaultPriceRequester.prototype = Object.create(PriceRequester.prototype);
BullionVaultPriceRequester.prototype.constructor = BullionVaultPriceRequester;

BullionVaultPriceRequester.prototype.processResponse = function (response, body) {
    try {
        var data = JSON.parse(body);
        var symbolToFind = BullionVaultPriceRequester.config.symbol_map[this.symbol];
        
        // Buscamos el mercado correcto en la lista de BullionVault
        var market = data.markets.find(m => m.securityId === symbolToFind);

        if (market && market.pricesBuy && market.pricesBuy.length > 0) {
            // Precios en BullionVault vienen por KG, convertimos a Onza (32.1507)
            var bid = market.pricesBuy[0].limit / 32.1507;
            var ask = market.pricesSell[0].limit / 32.1507;

            console.log("BullionVault JSON OK: " + this.symbol + " -> " + bid);
            return new messages.Symbol(this.getExchange(), this.symbol, bid, ask);
        }
    } catch (e) {
        console.log("BullionVault Error: " + e.message);
    }
    return null;
};

module.exports = {
    register: function () {
        var BullionVaultStreamer = Streamer(BullionVaultPriceRequester, 20000); // 20 segs
        Plugin_.register(BullionVaultPriceRequester, BullionVaultStreamer);
    }
};
