var cheerio = require('cheerio'),
    config = require('../../config/config'),
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
        "XAUUSD" : "GOLD", 
        "XAGUSD" : "SILVER" 
    },
    url_template: (
        'https://www.bullionvault.com/view_market_xml.do' +
        '?considerationCurrency=USD&securityClassNarrative=<<SYMBOL>>'
    ),
};

BullionVaultPriceRequester.prototype = Object.create(PriceRequester.prototype);
BullionVaultPriceRequester.prototype.constructor = BullionVaultPriceRequester;

BullionVaultPriceRequester.prototype.processResponse = function (response, body) {
    var $ = cheerio.load(body, { xmlMode: true }),
        get_price = function(op) {
            var prices = [];
            $(op + "Prices > price").each(function(index, elem){
                if (elem.attribs && elem.attribs.limit) {
                    prices.push(parseFloat(elem.attribs.limit));
                }
            });

            if (prices.length === 0) return 0;

            var pricePerKilo = (op === "buy" ? Math.max.apply(null, prices) : Math.min.apply(null, prices));
            return pricePerKilo / 32.1507;
        },
        bid = get_price("buy"),
        ask = get_price("sell");
    
    if (bid === 0 || isNaN(bid)) {
        console.log("BullionVault: Error al extraer precio para " + this.symbol);
    } else {
        console.log("BullionVault: Precio actualizado para " + this.symbol + " -> " + bid);
    }
    
    return new messages.Symbol(this.getExchange(), this.symbol, bid, ask);
};

module.exports = {
    register: function () {
        var BullionVaultStreamer = Streamer(BullionVaultPriceRequester, 15000);
        Plugin_.register(BullionVaultPriceRequester, BullionVaultStreamer);
    }
};
