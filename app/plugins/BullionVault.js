var config = require('../../config/config'),
    messages = require('../../public/lib/messages.js'),
    Plugin_ = require('../models/Plugin.js'),
    PriceRequester = require('../models/PriceRequester.js'),
    Streamer = require('../models/Streamer.js');

function BinanceGoldPriceRequester(symbol, options) {
    PriceRequester.call(this, symbol, options);
}

BinanceGoldPriceRequester.config = {
    exchange: 'bullionvault', // Mantenemos el nombre para que tu API no cambie
    symbol_map: { 
        "XAUUSD" : "PAXGUSDT"
    },
    url_template: 'https://api.binance.com/api/v3/ticker/bookTicker?symbol=<<SYMBOL>>'
};

BinanceGoldPriceRequester.prototype = Object.create(PriceRequester.prototype);
BinanceGoldPriceRequester.prototype.constructor = BinanceGoldPriceRequester;

BinanceGoldPriceRequester.prototype.processResponse = function (response, body) {
    try {
        var data = JSON.parse(body);
        if (data && data.bidPrice) {
            var bid = parseFloat(data.bidPrice);
            var ask = parseFloat(data.askPrice);

            console.log("Binance Gold OK: " + bid);
            return new messages.Symbol(this.getExchange(), this.symbol, bid, ask);
        }
    } catch (e) {
        console.log("Binance Gold Error: " + e.message);
    }
    return null;
};

module.exports = {
    register: function () {
        var BinanceStreamer = Streamer(BinanceGoldPriceRequester, 5000); // Actualiza cada 5 segs
        Plugin_.register(BinanceGoldPriceRequester, BinanceStreamer);
    }
};
