var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var port = process.env.PORT || 3000;
var app = express();

app.use(cookieParser());
app.use(session({ secret: "webinar-tool", resave: true, saveUninitialized: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());

app.use(express.static(__dirname + '/public'));

/*********** Routes ***********/
require('./routes/routes')({
    app: app,
    port: port
});
/*********** Start listening to requests ***********/
app.listen(port, function () {
    console.log("Express server listening on port %d", port);
});