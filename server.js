var	express 	= require('express');
var port = process.env.PORT || 3000;
var app = express();

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set("view options", {layout: false});
	app.engine('.ejs', require('ejs').__express);
	app.use(express.cookieParser());
	app.use(express.session({ secret: "webinar-tool" }));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

/*********** Routes ***********/

require('./routes/routes')({
	app     : app,
	port    : port
});


/*********** Start listening to requests ***********/

app.listen(port, function(){
	console.log("Express server listening on port %d", port);
});