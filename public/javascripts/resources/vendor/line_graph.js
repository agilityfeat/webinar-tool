//http://bl.ocks.org/mccannf/1629644

var w = 900,
    h = 450;

var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];

var maxDataPointsForDots = 50,
	transitionDuration = 1000;

var svg = null,
	yAxisGroup = null,
	xAxisGroup = null,
	dataCirclesGroup = null,
	dataLinesGroup = null;

function draw(options) {
	var data = options.data;

	if(data == null || data.length === 0){
		return false;
	}

	var margin = 40;
	var max = d3.max(data, function(d) { return d.value });
	var min = 0;
	var pointRadius = 4;
	var x = d3.time.scale().range([0, options.width - margin * 2]).domain([data[0].date, data[data.length - 1].date]);
	var y = d3.scale.linear().range([options.height - margin * 2, 0]).domain([min, max]);

	var xAxis = d3.svg.axis().scale(x).tickSize(options.height - margin * 2).tickPadding(10).ticks(7);
	var yAxis = d3.svg.axis().scale(y).orient('left').tickSize(-options.width + margin * 2).tickPadding(10);
	var t = null;

	svg = d3.select(options.container).select('svg').select('g');

	if (svg.empty()) {
		svg = d3.select(options.container)
			.append('svg:svg')
				.attr('width', options.width)
				.attr('height', options.height)
				.attr('class', 'viz')
			.append('svg:g')
				.attr('transform', 'translate(' + margin + ',' + margin + ')');
	}

	t = svg.transition().duration(transitionDuration);

	// y ticks and labels
	if (!yAxisGroup) {
		yAxisGroup = svg.append('svg:g').attr('class', 'yTick').call(yAxis);
	} else {
		t.select('.yTick').call(yAxis);
	}

	// x ticks and labels
	if (!xAxisGroup) {
		xAxisGroup = svg.append('svg:g').attr('class', 'xTick').call(xAxis);
	} else {
		t.select('.xTick').call(xAxis);
	}

	// Draw the lines
	if (!dataLinesGroup) {
		dataLinesGroup = svg.append('svg:g');
	}

	var dataLines = dataLinesGroup.selectAll('.data-line').data([data]);

	var line = d3.svg.line().x(function(d,i) {  return x(d.date); }).y(function(d) { return y(d.value); }).interpolate("linear");


	var garea = d3.svg.area().interpolate("linear").x(function(d) { 
		return x(d.date); 
	}).y0(options.height - margin * 2).y1(function(d) { 
		return y(d.value);
	});

	dataLines.enter().append('svg:path').attr("class", "area").attr("d", garea(data));

	dataLines.enter().append('path').attr('class', 'data-line').style('opacity', 0.3).attr("d", line(data));

	dataLines.transition().attr("d", line).duration(transitionDuration).style('opacity', 1).attr("transform", function(d) { return "translate(" + x(d.date) + "," + y(d.value) + ")"; });

	dataLines.exit().transition().attr("d", line).duration(transitionDuration).attr("transform", function(d) { return "translate(" + x(d.date) + "," + y(0) + ")"; }).style('opacity', 1e-6).remove();

	d3.selectAll(".area").transition().duration(transitionDuration).attr("d", garea(data));

	// Draw the points
	if (!dataCirclesGroup) {
		dataCirclesGroup = svg.append('svg:g');
	}

	var circles = dataCirclesGroup.selectAll('.data-point').data(data);

	circles.enter().append('svg:circle')
		.attr('class', function(d) { 
			return "data-point " + d.mood_name; 
		})
		.style('opacity', 1e-6)
		.attr('cx', function(d) { return x(d.date) })
		.attr('data-mood-name', function(d) { 
			return d.mood_name; 
		})
		.attr('cy', function() { return y(0) })
		.attr('r', function() { return (data.length <= maxDataPointsForDots) ? pointRadius : 0 })
	.transition().duration(transitionDuration)
		.style('opacity', 1)
		.attr('cx', function(d) { return x(d.date) })
		.attr('cy', function(d) { return y(d.value) });

	circles.transition().duration(transitionDuration)
		.attr('cx', function(d) { return x(d.date) })
		.attr('cy', function(d) { return y(d.value) })
		.attr('r', function() { return (data.length <= maxDataPointsForDots) ? pointRadius : 0 })
		.style('opacity', 1);

	circles.exit().transition().duration(transitionDuration)
		.attr('cy', function() { return y(0) })
		.style("opacity", 1e-6)
		.remove();

      $('svg circle').tipsy({ 
			gravity: 'w', 
			html: true, 
			title: function() {
				var d = this.__data__;
				var now = Date.now()
				var pDate = d.date.getTime();
				var when = ((now - pDate) / 60000).toFixed(2);
				var display_text = options.moods[Number(d.value)].name;
			  	return when + ' minutes ago<br>Score: ' + display_text; 
			}
      });
}

function generateData() {

	var data = [];
	
	var i = 30//Math.max(Math.round(Math.random()*100), 3);

	var getRandomInt = function() {
		var min = 1;
		var max = 5;
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}	

	while (i--) {
		var date = new Date();
		//date.setDate(date.getDate() - i);
		date.setHours(date.getHours(), -i, 0, 0);//setHours(hour,min,sec,millisec)
		data.push({'value' : getRandomInt(), 'date' : date});
	}
	return data;
}

d3.select('#button').on('click', draw);
