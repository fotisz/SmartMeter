/**
 * response is a global for the 6 month data
 * newData is a global for the 6 month data that is re-populated when time ranges are changed
 */
var response;
var newData;

/**
 * Setting the margins, heights and width.
 * The variables appended with a '2' are for the context / brush menu
 */
var margin = {top: 10, right: 10, bottom: 100, left: 40};
var margin2 = {top: 430, right: 10, bottom: 20, left: 40};
var height = 500 - margin.top - margin.bottom;
var height2 = 500 - margin2.top - margin2.bottom;
var width = 769 - margin.left - margin.right;

/**
 * Parse Date functions.
 * The 6 month data has a 4 digit year (parseDate)
 */
var parseDate = d3.time.format("%d/%m/%Y %H:%M").parse;
var parseDateSidebar = d3.time.format("%d %b %H:%M");

/**
 * bisectDate returns a date string
 * Based on the data object during focus tracking
 *
 * @param {Object} d
 * @return {String} d.date
 */
var bisectDate = d3.bisector(function (d) {
  return d.date;
}).left;

/**
 * X and Y Ranges.
 * The y variable name with a 1 appended (y1) is for the right y axis
 * The x variables with a 2 appended (x2, y2) are for the context / brush chart
 */
var x = d3.time.scale().range([0, width - 32]);
var y = d3.scale.linear().range([height, 0]);
var y1 = d3.scale.linear().range([height, 0]);
var x2 = d3.time.scale().range([0, width - 32]);
var y2 = d3.scale.linear().range([height2, 0]);

/**
 * X and Y Axes.
 * The y variable with a 1 appended (yAxis1) is for the right y axis
 * The x variable with a 2 appended (xAxis2) is for the context / brush chart
 */
var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(6).tickPadding(10).innerTickSize(-height);
var yAxis = d3.svg.axis().scale(y).orient("left").ticks(6).tickPadding(10);
var yAxis1 = d3.svg.axis().scale(y1).orient("right").ticks(6).tickPadding(10);
var xAxis2 = d3.svg.axis().scale(x2).orient("bottom").ticks(6).tickPadding(5);

/**
 * Area Chart functions.
 * The area charts are stacked on top of one another
 *
 * mainArea() constructs a new area chart generator for the General Supply usage
 *
 * @param {Object}
 * @return {String} d.date
 * @return {Number} d.generalSupplyKWH
 *
 * mainArea1() constructs a new area chart generator for the Off Peak usage
 *
 * @param {Object}
 * @return {String} d.date
 * @return {Number} d.offPeakKWH
 */
var mainArea = d3.svg.area()
  .interpolate("monotone")
  .x(function (d) { return x(d.date); })
  .y0(height)
  .y1(function (d) {return y(d.generalSupplyKWH);});

var mainArea1 = d3.svg.area()
  .interpolate("monotone")
  .x(function (d) {return x(d.date);})
  .y0(height)
  .y1(function (d) {return y1(0.38); });

/**
 * Brush Area Chart.
 * brushArea constructs a new area chart generator for the General Supply usage for the brush area
 * The area chart will only display one chart so it is not too busy.
 *
 * @param {Object} d
 * @return {String} d.date
 * @return {Number} d.generalSupplyKWH
 */
var brushArea = d3.svg.area()
  .interpolate("monotone")
  .x(function (d) {
    return x2(d.date);
  })
  .y0(height2)
  .y1(function (d) {
    return y2(d.generalSupplyKWH);
  });

/**
 * Brush.
 * Initialise the brush functions for 'brushend' and 'brush'
 * brushEnded is to snap the brush to the nearest day
 * brush is called when the brush is moved
 */
var brush = d3.svg.brush()
  .x(x2)
  .on("brushend", brushEnded)
  .on("brush", brushMove);

/**
 * Brush Arc.
 *
 * arc constructs a new arc generator with the outer radius, start angle and end angle accessor functions
 * This is to calculate the angles for the brush handles
 *
 * @param {Object} d
 * @param {Number} i
 * @return {Number} i
 */
var arc = d3.svg.arc()
  .outerRadius(height2 / 4)
  .startAngle(0)
  .endAngle(function (d, i) {
    return i ? -Math.PI : Math.PI;
  });

/**
 * SVG.
 * Create the SVG element and append it to the div with the id of "area-chart"
 * Call the responsivefy function to make the chart responsive when re-sized.
 */
var svg = d3.select("#area-chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .call(responsivefy);

/**
 * Clip Path.
 * Create a clip path for the SVG element to crop any overflow.
 */
svg.append("defs").append("svg:clipPath")
  .attr("id", "clip")
  .append("svg:rect")
  .attr("x", "0")
  .attr("y", "0")
  .attr("width", width - 32)
  .attr("height", height);

/**
 * Focus Area Chart G
 * Create a g element for the focus area chart.
 * This is the large / main area chart NOT the brush area chart.
 */
var focusMouseTracking;
var focus = svg.append("g")
  .attr("class", "focus")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

/**
 * Content / Brush Area Chart G
 * Create a g element for the context / brush area chart.
 * This is the brush-able area chart NOT the large / main area chart.
 */
var context = svg.append("g")
  .attr("class", "context")
  .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

/**
 * D3 Legend Plugin Code.
 * ordinal maps the domain key values to the range colour values.
 * legend creates a g element to append the elements to
 * legendOrdinal draws the SVG elements and applues on click listener
 */
var ordinal = d3.scale.ordinal()
  .domain(["End User Nightly Consumption", "National Averge"])
  .range(["rgb(0, 151, 136)", "rgb(71, 176, 75)"]);

var legend = svg.append("g")
  .attr("class", "legend");

legend.append("g")
  .attr("class", "legendOrdinal")
  .attr("transform", "translate(" + (width - 200) + ", 20)");

var legendOrdinal = d3.legend.color()
  .shape("path", d3.svg.symbol().type("triangle-up").size(150)())
  .shapePadding(10)
  .scale(ordinal)
  .on("cellclick", function (d) {
    legendClick(d);
  });

svg.select(".legendOrdinal")
  .call(legendOrdinal);
    

/**
 * Data Calls with D3 queue.
 * queue defers d3 data requests and calls a function when complete
 * await call a function (useDatasets) to use the data once it is loaded
 */
queue()
  .defer(d3.csv, '6_months.csv')
  .await(useDatasets);

/**
 * useDatasets function
 * This function is called via  d3 queue .await() once data is loaded
 * The dataset are looped through to change the key name of objects and parse values.
 * Once the data is sorted it is applied to the relevant globals (response, responseOne)
 * After that the getMonthlyData function is called to get the data between the initial ranges
 * Finally drawAreaChartVisualisation function is called and the monthly data is passed into it
 *
 * @param {Object} error
 * @param {Array} data
 * @param {Array} dataOne
 */
function useDatasets(error, data) {
  if (error) {
    throw error;
  }
  var initialMonthlyData;
  response = tidyData(data);
  initialMonthlyData = getMonthlyData(1);
  drawAreaChartVisualisation(initialMonthlyData);
}

/**
 * Tidy uo the datasets
 *
 * These two functions give the data keys new names and parse the dates
 *
 * tidyData() returns an array
 * @param {Array} data
 * @return {Array} data
 *
 * tidyDataOne() returns an array
 * @param {Array} dataOne
 * @return {Array} dataOne
 */
function tidyData(data) {
  data.forEach(function (d) {
    d.date = parseDate(d["End Datetime"]);
    d.generalSupplyKWH = +d["General Supply KWH"];
    d.offPeakKWH = +d["Off Peak KWH"];
  });
  return getNightlyData(data);
}

function tidyDataOne(dataOne) {
  dataOne.forEach(function (d) {
    d.date = parseDateTwoDigitYear(d["End Datetime"]);
    d.generalSupplyKWH = +d["General Supply KWH"];
    d.offPeakKWH = +d["Off Peak KWH"];
  });
  return getNightlyData(dataOne);
}

/**
 * The function getNightlyData() returns array with values just for the night
 * The function getMonthlyStats() returns object of various statistics.
 * The variable mean is global variable and is updated with the obj.mean from getMonthlyStats()
 *
 * getNightlyData() returns an array
 * @param {Array} data
 * @return {Array} data
 *
 * getMonthlyStats() returns an object
 * @param {array} data
 * @return {object} stats
 */
var mean;
function getNightlyData(data) {
  var stats;
  data.forEach(function (d) {
    if (d.date.getHours() > 6 && d.date.getHours() < 20) {
      d.generalSupplyKWH = 0;
    }
  });
  stats = getMonthlyStats(data);
  mean = stats.mean;
  console.log(mean)
  return data;
}

/**
 * Get Data Between Two Given Dates.
 *
 * getDataForTimePeriod() returns an array
 * Used by the getMonthlyData function.
 *
 * @param {Object} startDate
 * @param {Object} endDate
 * @return {Array} newData
 */
function getDataForTimePeriod(startDate, endDate) {
  newData = [];
  response.forEach(function (d) {
    if (d.date >= startDate && d.date < endDate) {
      newData.push(d);
    }
  });
  return newData;
}

/**
 * Get Start and End dates for a given month.
 *
 * getMonthlyData() returns an array
 * Called when the select menu is changed.
 * Called on the initial drawing of the area charts
 *
 * @param {Number} month
 * @return {Array} getDataForTimePeriod(Date, Date)
 */
function getMonthlyData(month) {
  var startDate = new Date(month + "/01" + "/2013");
  var endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setMinutes(endDate.getMinutes() - 30);

  getWeeklyData(month);
  return getDataForTimePeriod(startDate, endDate);
}
function getWeeklyData(month) {
  var startDate = new Date(month + "/01" + "/2013");
  var endDate = new Date(startDate);
  endDate.setDate(7);
  //console.log(startDate);
  //console.log(endDate);
  return getDataForTimePeriod(startDate, endDate);
}

/**
 * Get stats for a months data
 *
 * getMonthlyStats() returns an object
 * Called when updating the global variable mean
 *
 * @param {array} data
 * @return {object}
 */
function getMonthlyStats(data) {
   var min = d3.min(data, function (d) { return d.generalSupplyKWH; }),
       max = d3.max(data, function (d) { return d.generalSupplyKWH; }),
       mean = d3.mean(data, function (d) { return d.generalSupplyKWH; }),
       sum = d3.sum(data, function (d) { return d.generalSupplyKWH; });
   return {min: min, max: max, mean: mean, sum: sum};
}

/**
 * When the Brush is moved.
 * x.domain re calculates the brush extents
 * The focus.select calls reset the d values for both charts
 * in the brush extents and calls the aXis function
 */
function brushMove() {
  x.domain(brush.empty() ? x2.domain() : brush.extent());
  focus.select(".main-area").attr("d", mainArea);
  focus.select(".main-area-2").attr("d", mainArea1);
  focus.select(".x.axis").call(xAxis);
}

/**
 * Snapping brush to nearest day
 * When the brush is moved the end values are snapped the the nearest day.
 * This is to improve UX.
 */
function brushEnded() {
  // only transition after input
  if (!d3.event.sourceEvent) {
    return;
  }
  var extent0 = brush.extent();
  var extent1 = extent0.map(d3.time.day.round);
  // if empty when rounded, use floor & ceil instead
  if (extent1[0] >= extent1[1]) {
    extent1[0] = d3.time.day.floor(extent0[0]);
    extent1[1] = d3.time.day.ceil(extent0[1]);
  }
  d3.select(this).transition()
    .call(brush.extent(extent1))
    .call(brush.event);
}

/**
 * Set Brush Extents a Day Either side of Monthly High Usage
 * max gets the highest General Supply KWH usgae for the passed in month.
 * The monthly passed in data is the looped through to get the start and end dates
 * 1 day before and after that monthly high usage point,
 */
function setMonthHighBrushExtents(data) {
  var max = d3.max(data.map(function (d) {
    return d.generalSupplyKWH;
  }));
  data.forEach(function (d) {
    if (d.generalSupplyKWH === max) {
      return brush.extent([
        new Date(d.date).setDate(new Date(d.date).getDate() - 1),
        new Date(d.date).setDate(new Date(d.date).getDate() + 1)
      ]);
    }
  });
  brushMove();
}

/**
 * Draw The Area Chart
 * ADD COMMENTS HERE
 */
function drawAreaChartVisualisation(passedInData) {
  var focusPath,
    focusYAxisLeft,
    focusYAxisRight;

  // Setting x and y domains
  x.domain(d3.extent(passedInData.map(function (d) { return d.date; })));
  y.domain([0, d3.max(passedInData, function (d) { return d.generalSupplyKWH; }) * 1.2]);
  y1.domain([0, d3.max(passedInData, function (d) { return d.offPeakKWH; }) * 1.2]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  // Call function to set initial brush date range
  setMonthHighBrushExtents(passedInData);

  focusPath = focus.append("g")
    .attr("class", "path-container")
    .attr("clip-path", "url(#clip)");

  // Path for Main Area Chart
  focusPath.append("path")
    .datum(passedInData)
    .attr("class", "area main-area")
    .attr("d", mainArea);

  // Path for Main Area Chart 1
  focusPath.append("path")
    .datum(passedInData)
    .attr("class", "main-area-2")
    .attr("d", mainArea1);

  focusYAxisLeft = focus.append("g")
    .attr("class", "y axis main-area-y-axis")
    .call(yAxis);

  focusYAxisLeft.append("text")
    .attr("transform", "rotate(-90)")
    .attr("class", "axis-label-text")
    .attr("y", 10)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("General Supply KWH");

  focusYAxisRight = focus.append("g")
    .attr("class", "y axis main-area-y-axis-right")
    .attr("transform", "translate(" + (width - 32) + " ,0)")
    .call(yAxis1);

  focusYAxisRight.append("text")
    .attr("transform", "rotate(-90)")
    .attr("class", "axis-label-text")
    .attr("y", -16)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Off Peak KWH");

  // X axis for Main Area Charts
  focus.append("g")
    .attr("class", "x axis main-area-x-axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  focusMouseTracking = focus.append('g')
    .attr("class", "focus-tracking")
    .style('display', 'none')
    .attr("clip-path", "url(#clip)");

  focusMouseTracking.append('line')
    .attr('id', 'focusLineLeft')
    .attr('class', 'focusLine');

  focusMouseTracking.append('circle')
    .attr('id', 'focusCircleLeft')
    .attr('r', 7)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('class', 'circle focusCircle');

  focusMouseTracking.append('line')
    .attr('id', 'focusLineRight')
    .attr('class', 'focusLine');

  focusMouseTracking.append('circle')
    .attr('id', 'focusCircleRight')
    .attr('r', 7)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('class', 'circle focusCircle');

  focus.append('rect')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .attr("clip-path", "url(#clip)")
    .on('mouseover', function () {
      focusMouseTracking.style('display', null);
    })
    .on('mouseout', function () {
      focusMouseTracking.style('display', 'none');
    })
    .on('mousemove', function () {
      var mousePosition = d3.mouse(this);
      // TODO :: Get new data dynamically because it is being overwriiten by scatter h4 click
      drawOverlayLinesAndCircles(newData, mousePosition);
    });

  context.append("g")
    .attr("class", "context-path-container")
    .append("path")
    .datum(passedInData)
    .attr("class", "area brush-area")
    .attr("d", brushArea);

  // X axis for Brush-able Area Chart
  context.append("g")
    .attr("class", "x axis x-axis-brush-area")
    .attr("transform", "translate(0," + height2 + ")")
    .call(xAxis2);

  context.append("g")
    .attr("class", "x brush x-axis-brush")
    .call(brush)
    .selectAll("rect")
    .attr("height", height2);

  context.selectAll(".resize").append("path")
    .attr("class", "brush-path")
    .attr("transform", "translate(0," + height2 / 2 + ")")
    .attr("d", arc);

  // Hide spinner when visualisation is drawn
  d3.select(".mdl-js-spinner").classed("is-active", false);
}

/**
 * Draw The Overlay lines and Circles
 * ADD COMMENTS HERE
 */
function drawOverlayLinesAndCircles(data, mousePosition) {
  var mouseDate = x.invert(mousePosition[0]);
  var index = bisectDate(data, mouseDate);
  var d0 = data[index - 1];
  var d1 = data[index];
  var d = mouseDate - d0.date > d1.date - mouseDate ? d1 : d0;
  var xOverlay = x(d.date);
  var yOverlay = y(d.generalSupplyKWH);
  var yOverlayRight = y1(d.offPeakKWH);

  focusMouseTracking.select('#focusLineLeft')
    .attr('x1', 0)
    .attr('y1', yOverlay)
    .attr('x2', xOverlay)
    .attr('y2', yOverlay);

  focusMouseTracking.select('#focusCircleLeft')
    .attr('cx', xOverlay)
    .attr('cy', yOverlay);

  focusMouseTracking.select('#focusLineRight')
    .attr('x1', width)
    .attr('y1', yOverlayRight)
    .attr('x2', xOverlay)
    .attr('y2', yOverlayRight);

  focusMouseTracking.select('#focusCircleRight')
    .attr('cx', xOverlay)
    .attr('cy', yOverlayRight);

  if (d3.select(".main-area").style("fill-opacity") === "0") {
    focusMouseTracking.select('#focusLineLeft').style("stroke", "none");
    focusMouseTracking.select('#focusCircleLeft').style("fill", "none").style("stroke", "none");
  } else {
    focusMouseTracking.select('#focusLineLeft').style("stroke", "#000000");
    focusMouseTracking.select('#focusCircleLeft').style("fill", "white").style("stroke", "#000000");
    setSidebarText(d);
  }

  if (d3.select(".main-area-2").style("fill-opacity") === "0" || d.offPeakKWH === 0) {
    focusMouseTracking.select('#focusLineRight').style("stroke", "none");
    focusMouseTracking.select('#focusCircleRight').style("fill", "none").style("stroke", "none");
  } else {
    focusMouseTracking.select('#focusLineRight').style("stroke", "#000000");
    focusMouseTracking.select('#focusCircleRight').style("fill", "white").style("stroke", "#000000");
    setSidebarText(d);
  }
}

/**
 * Set Sidebar Text
 * ADD COMMENTS HERE
 */
function setSidebarText(passedInMouseOverData) {
  var mouseOverData = passedInMouseOverData;
  d3.select(".kwh-usage-text-large").text(mouseOverData.generalSupplyKWH.toFixed(3));
  d3.select(".sidebar-date-text").text(parseDateSidebar(mouseOverData.date));
	// d3.select(".off-peak-kwh-usage-text-large").text(mouseOverData.offPeakKWH.toFixed(3));
  d3.select(".times-then-national-average-large").text((mouseOverData.generalSupplyKWH.toFixed(3) / 0.38).toFixed(3));
}

/**
 * Update Area Chart
 */
function updateGraph(passedInData) {
  // Update the domains for the axis for the new data
  x.domain(d3.extent(passedInData.map(function (d) { return d.date; })));
  y.domain([0, d3.max(passedInData, function (d) { return d.generalSupplyKWH; }) * 1.25]);
  y1.domain([0, d3.max(passedInData, function (d) { return d.offPeakKWH; }) * 1.25]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  // Give the focus chart new data
  focus.selectAll("path")
    .datum(passedInData);

  // Setting the focus and context charts to be focused
  // on the monthly high values for the selected month
  setMonthHighBrushExtents(passedInData);

  // Update the main area chart path (General Supply)
  d3.selectAll(".main-area")
    .transition()
    .duration(500)
    .attr("d", mainArea(passedInData));

  // Update the overlay area chart path (Off Peak KWH)
  d3.selectAll(".main-area-2")
    .transition()
    .duration(500)
    .attr("d", mainArea1(passedInData));

  // Call the x axis to update the main area charts
  focus.select(".x.axis")
    .transition()
    .duration(500)
    .call(xAxis);

  // Call the y axis to update the main area charts
  focus.select(".main-area-y-axis")
    .transition()
    .duration(500)
    .call(yAxis);

  // Call the y axis to update the main area charts right axis
  focus.select(".main-area-y-axis-right")
    .transition()
    .duration(500)
    .call(yAxis1);
  // Update the context menu / brush path
  d3.selectAll(".brush-area")
    .transition()
    .duration(500)
    .attr("d", brushArea(passedInData));

  // Call the x axis 2 to update the context menu / brush area charts
  context.select(".x-axis-brush-area")
    .transition()
    .duration(500)
    .call(xAxis2);

  // Call brush
  context.select(".x-axis-brush")
    .call(brush);
}

/**
 * Select Menu Code
 */
var selectMenu = d3.select(".select-menu");
function selectMenuChange() {
  var selectedIndex = selectMenu.property('selectedIndex');
  var monthData = getMonthlyData(selectedIndex + 1);
  var monthlyStats = getMonthlyStats(monthData);
  //setMonthlyStatsText(monthlyStats);
  updateGraph(monthData);
}
selectMenu.on("change", selectMenuChange);

/**
 * D3 Legend Click
 * Hide the corresponding area chart when a legend is clicked
 * ADD MORE COMMENTS HERE
 */
function legendClick(passedInLegend) {
  var mainArea = d3.select(".main-area");
  var mainArea1 = d3.select(".main-area-2");
  if (passedInLegend === "General Supply KWH") {
    if (mainArea.style("fill-opacity") === "0.8") {
      d3.select(".main-area").style("fill-opacity", 0);
    } else {
      d3.select(".main-area").style("fill-opacity", 0.8);
    }
  } else {
    if (mainArea1.style("stroke-width") === "5px") {
      d3.select(".main-area-2").style("stroke-width", 0);
    } else {
      d3.select(".main-area-2").style("stroke-width", "5px");
    }
  }
}

function responsivefy(svg) {
  // get container + svg aspect ratio
  var container = d3.select(svg.node().parentNode);
  var width = parseInt(svg.style("width"), 10);
  var height = parseInt(svg.style("height"), 10);
  var aspect = width / height;
  // add viewBox and preserveAspectRatio properties,
  // and call resize so that svg resizes on inital page load
  svg.attr("viewBox", "0 0 " + width + " " + height)
    .attr("perserveAspectRatio", "xMinYMid")
    .call(resize);
  // to register multiple listeners for same event type,
  // you need to add namespace, i.e., 'click.foo'
  // necessary if you call invoke this function for multiple svgs
  // api docs: https://github.com/mbostock/d3/wiki/Selections#on
  d3.select(window).on("resize." + container.attr("id"), resize);
  // get width of container and resize svg to fit it
  function resize() {
    var targetWidth = parseInt(container.style("width"), 10);
    svg.attr("width", targetWidth);
    svg.attr("height", Math.round(targetWidth / aspect));
  }
}
