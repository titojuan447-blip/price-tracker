var cheerio = require('cheerio'),
    config = require('../../config/config'),
    messages = require('../../public/lib/messages.js'),
    Plugin_ = require('../models/Plugin.js'),
    PriceRequester = require('../models/PriceRequester.js'),
    Streamer = require('../models/Streamer.js');

/**
 * BullionVault
 *
 * Docs: https://www.bullionvault.com/help/xml_api.html
 */

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
    // Forzamos xmlMode para que cheerio lea correctamente las etiquetas del XML de BullionVault
    var $ = cheerio.load(body, { xmlMode: true }),
        get_price = function(op) {
            var prices = [];
            
            // Buscamos los nodos de precio según la operación (buy/sell)
            $(op + "Prices > price").each(function(index, elem){
                if (elem.attribs && elem.attribs.limit) {
                    prices.push(parseFloat(elem.attribs.limit));
                }
            });

            if (prices.length === 0) return 0;

            // BullionVault entrega precios por KILOGRAMO. 
            // Dividimos por 32.1507 para convertir a ONZA TROY.
            // Para 'buy' buscamos el mejor precio de compra (máximo)
            // Para 'sell' buscamos el mejor precio de venta (mínimo)
            var pricePerKilo = (op === "buy" ? Math.max.apply(null, prices) : Math.min.apply(null, prices));
            return pricePerKilo / 32.1507;
        },
        bid = get_price("buy"),
        ask = get_price("sell");
    
    // Log de control para ver en Render si el precio se procesó
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
};;
