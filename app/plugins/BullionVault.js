var messages = require('../../public/lib/messages.js'),
    Plugin_ = require('../models/Plugin.js'),
    PriceRequester = require('../models/PriceRequester.js'),
    Streamer = require('../models/Streamer.js');

function BullionVaultPriceRequester(symbol, options) {
    PriceRequester.call(this, symbol, options);
}

BullionVaultPriceRequester.config = {
    exchange: 'bullionvault',
    symbol_map: { 
        "XAUUSD" : "PAXGUSDT" 
    },
    url_template: 'https://api.binance.com/api/v3/ticker/price?symbol=<<SYMBOL>>'
};

BullionVaultPriceRequester.prototype = Object.create(PriceRequester.prototype);
BullionVaultPriceRequester.prototype.constructor = BullionVaultPriceRequester;

BullionVaultPriceRequester.prototype.processResponse = function (response, body) {
    try {
        var data = JSON.parse(body);
        if (data && data.price) {
            var price = parseFloat(data.price);
            
            // Log para verificar en Render que el dato está llegando
            console.log("DATO OBTENIDO (Binance Gold): " + price);
            
            // Retornamos el objeto de símbolo con el precio actual
            return new messages.Symbol(this.getExchange(), this.symbol, price, price);
        }
    } catch (e) {
        console.log("Error en Plugin Gold: " + e.message);
    }
    return null;
};

module.exports = {
    register: function () {
        // Actualizamos cada 10 segundos
        var BullionVaultStreamer = Streamer(BullionVaultPriceRequester, 10000);
        Plugin_.register(BullionVaultPriceRequester, BullionVaultStreamer);
    }
};
