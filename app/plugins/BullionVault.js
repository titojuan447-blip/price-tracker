var messages = require('../../public/lib/messages.js'),
    Plugin_ = require('../models/Plugin.js'),
    PriceRequester = require('../models/PriceRequester.js'),
    Streamer = require('../models/Streamer.js');

function BullionVaultPriceRequester(symbol, options) {
    PriceRequester.call(this, symbol, options);
}

// Forzamos la configuración para que ignore el símbolo externo y use Binance
BullionVaultPriceRequester.config = {
    exchange: 'bullionvault',
    symbol_map: { "XAUUSD" : "PAXGUSDT" },
    url_template: 'https://api.binance.com/api/v3/ticker/price?symbol=<<SYMBOL>>'
};

BullionVaultPriceRequester.prototype = Object.create(PriceRequester.prototype);
BullionVaultPriceRequester.prototype.constructor = BullionVaultPriceRequester;

BullionVaultPriceRequester.prototype.processResponse = function (response, body) {
    try {
        var data = JSON.parse(body);
        if (data && data.price) {
            var price = parseFloat(data.price);
            console.log("!!! PRECIO OBTENIDO: " + price);
            // Devolvemos el mismo precio para compra y venta para asegurar que cargue
            return new messages.Symbol(this.getExchange(), this.symbol, price, price);
        }
    } catch (e) {
        console.log("Error en Plugin Gold: " + e.message);
    }
    return null;
};

module.exports = {
    register: function () {
        var BullionVaultStreamer = Streamer(BullionVaultPriceRequester, 10000);
        Plugin_.register(BullionVaultPriceRequester, BullionVaultStreamer);
    }
};
