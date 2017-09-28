var routes = function (params) {

	var app = params.app;

	app.get('/', function(req, res){
			res.render('index.ejs');
		})
		
	app.get('/presenter', function(req, res){
			res.render('index.ejs');
		})
		
	app.get('/add', function(req, res){
			res.render('add.ejs');
		})

}
module.exports = routes;
console.log("All routes registered");