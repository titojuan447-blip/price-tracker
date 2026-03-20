var messages = require('../../public/lib/messages.js'),
    Plugin_ = require('../models/Plugin.js'),
    PriceRequester = require('../models/PriceRequester.js'),
    Streamer = require('../models/Streamer.js');

function BullionVaultPriceRequester(symbol, options) {
    PriceRequester.call(this, symbol, options);
}

BullionVaultPriceRequester.config = {
    exchange: 'bullionvault',
    symbol_map: { "XAUUSD" : "PAXGUSDT" },
    url_template: 'https://api.binance.com/api/v3/ticker/price?symbol=<<SYMBOL>>'
};

BullionVaultPriceRequester.prototype = Object.create(PriceRequester.prototype);
BullionVaultPriceRequester.prototype.constructor = BullionVaultPriceRequester;

// Sobrescribimos el método de solicitud para asegurar que use HTTPS correctamente en Node 14
BullionVaultPriceRequester.prototype.doRequest = function () {
    var self = this;
    var https = require('https');
    
    https.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', (res) => {
        var body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
            try {
                var data = JSON.parse(body);
                var price = parseFloat(data.price);
                if (price > 0) {
                    var symbolObj = new messages.Symbol(self.getExchange(), self.symbol, price, price);
                    self.emit('price', symbolObj);
                    console.log("!!! ORO ACTUALIZADO: " + price);
                }
            } catch (e) { console.log("Err Oro JSON: " + e.message); }
        });
    }).on('error', (e) => { console.log("Err Oro HTTP: " + e.message); });
};

module.exports = {
    register: function () {
        var BullionVaultStreamer = Streamer(BullionVaultPriceRequester, 15000);
        Plugin_.register(BullionVaultPriceRequester, BullionVaultStreamer);
    }
};
