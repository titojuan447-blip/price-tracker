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

// Añadimos User-Agent para evitar bloqueos
BullionVaultPriceRequester.prototype.getOptions = function() {
    return {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };
};

BullionVaultPriceRequester.prototype.processResponse = function (response, body) {
    try {
        var $ = cheerio.load(body, { xmlMode: true });
        
        var get_price = function(op) {
            var prices = [];
            // BullionVault usa tags como <sellPrices> y <price limit="..."/>
            var tag = op === "buy" ? "buyPrices" : "sellPrices";
            
            $(tag + " price").each(function(i, elem) {
                if (elem.attribs && elem.attribs.limit) {
                    prices.push(parseFloat(elem.attribs.limit));
                }
            });

            if (prices.length === 0) return 0;

            // Oro: precio por Kilo / 32.1507 = Onza
            var val = (op === "buy" ? Math.max(...prices) : Math.min(...prices));
            return val / 32.1507;
        };

        var bid = get_price("buy");
        var ask = get_price("sell");

        if (bid > 0) {
            console.log("BullionVault OK: " + this.symbol + " -> " + bid);
            return new messages.Symbol(this.getExchange(), this.symbol, bid, ask);
        } else {
            console.log("BullionVault: XML recibido pero sin precios para " + this.symbol);
        }
    } catch (e) {
        console.log("BullionVault: Error procesando XML: " + e.message);
    }
    return null;
};

module.exports = {
    register: function () {
        var BullionVaultStreamer = Streamer(BullionVaultPriceRequester, 15000);
        Plugin_.register(BullionVaultPriceRequester, BullionVaultStreamer);
    }
};
