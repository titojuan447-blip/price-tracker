var fs = require('fs'),
    ws = require('ws'),
    http = require('http'),
    express = require('express');

var config = require('./config/config.js'),
    messages = require('./public/lib/messages.js'),
    Registry = require('./app/models/Registry.js'),
    HTTPRequestHandler = require('./app/controllers/HTTPRequestHandler.js'),
    WSClientHandler = require('./app/controllers/WSClientHandler.js');

var app = express(),
    registry = Registry.getInstance();

var modules_dirs = ['./app/plugins/', './app/handlers/'];

// Force all dates to be handled in UTC:
process.env.tz = 'UTC';

// CARGA AUTOMÁTICA DE MÓDULOS
modules_dirs.forEach(function (modules_dir) {
    if (!fs.existsSync(modules_dir)) return;
    var files = fs.readdirSync(modules_dir);
    files.forEach(function (file) {
        if (file.endsWith('.js')) {
            var module = require(modules_dir + file);
            if (module && typeof module.register === 'function') {
                module.register();
            }
        }
    });
});

// CARGA FORZADA DEL ORO (Para asegurar que Render lo vea)
try {
    require('./app/plugins/BullionVault.js').register();
    console.log('main: BullionVault plugin forced successfully');
} catch (e) {
    console.log('main: Error forcing BullionVault plugin: ' + e.message);
}

app.use(express.static(__dirname + '/public'));

app.get("/api/v1/symbols/:symbol/:exchange", function(req, res) {
    var symbol = req.params.symbol,
        exchange = req.params.exchange,
        request = new messages.SymbolRequest(symbol, exchange);
    var handler = new HTTPRequestHandler(ws);
    handler.handle(request, req, res);
});

app.get("/api/v1/symbols/:symbol/:exchange/series", function(req, res) {
    var symbol = req.params.symbol,
        exchange = req.params.exchange,
        start = req.query.start,
        end = req.query.end,
        request = new messages.SeriesRequest(symbol, exchange, {
            start: start,
            end: end
        });
    var handler = new HTTPRequestHandler(ws);
    handler.handle(request, req, res);
});

app.get("/api/v1/symbols", function(req, res) {
    var request = new messages.SymbolsRequest();
    var handler = new HTTPRequestHandler(ws);
    handler.handle(request, req, res);
});

app.get("/api/v1/exchanges", function(req, res) {
    var request = new messages.ExchangesRequest();
    var handler = new HTTPRequestHandler(ws);
    handler.handle(request, req, res);
});

var server = http.createServer(app);
server.listen(config.server.port);

console.log('main: http server listening on %d', config.server.port);

var wss = new ws.Server({server: server});

console.log('main: websocket server created');

wss.on('connection', function(ws) {
    var handler = new WSClientHandler(ws);
    ws.on('message', function(message) {
        handler.handle_message(message);
    });
});

