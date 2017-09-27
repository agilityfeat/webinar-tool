var routes = function (params) {
    var app = params.app;
    app.get('/', function (req, res) {
        res.render('index.ejs');
    })
}
module.exports = routes;
console.log("All routes registered");