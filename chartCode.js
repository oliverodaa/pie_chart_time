// Written by David Buezas at http://bl.ocks.org/dbuezas/9572040
// Modified by Oliver O'Donnell
// Please use code freely, with attribution.
// MIT License for the stuff I changed, please.

// ==============|||||||||||===================

function initializeChart() {
  sliderValChange(document.getElementById("dataYear").value);
  // Get min and max from dataset
  document.getElementById("dataYear").setAttribute("min",startYear);
  document.getElementById("dataYear").setAttribute("max",endYear);
  // Min and max year next to sliderbar
  document.getElementById("startYear").innerHTML=startYear;
  document.getElementById("endYear").innerHTML=endYear;
}

function sliderValChange(sliderVal) {
  // Change the number next to the year slider
  document.getElementById("sliderVal").innerHTML=sliderVal;
  // Change the total
  var totalMoney = dataVals[sliderVal].reduce(function(x,y) {return x+y;},0);
  document.getElementById("pieTotal").innerHTML=totalMoney;
  // Update the chart to correspond to that year
  change(getData(sliderVal));
}

function getCurrentYear() {
  return document.getElementById("dataYear").value;
}

function getData(sliderVal) {
  return yearData(sliderVal);
}

// The domain labels correspond to specific colors
var color = d3.scale.category20()
  .domain(labels);

function yearData(sliderVal) {
  var labels = color.domain();
  var labelValuePairs = [];
  var dataForYear = dataVals[sliderVal];
  var totalItems = Math.min(labels.length,dataForYear.length);
  for (var i=0;i<totalItems;i++) {
    var currentDataItem = {
      label: labels[i],
      value: dataForYear[i]
    };
    labelValuePairs.push(currentDataItem);
  }
  return labelValuePairs;
}

function autoPlay() {
  if (getCurrentYear() == endYear) {
    setTimeout(function(){
      document.getElementById("dataYear").value = startYear;
      sliderValChange(document.getElementById("dataYear").value);
    },
    1000);
    return;
  }
  // Increment slider value
  document.getElementById("dataYear").value ++;
  sliderValChange(document.getElementById("dataYear").value);
  setTimeout(function(){autoPlay(); }, 1000);
}

function randomData (){
  var labels = color.domain();
  return labels.map(function(label){
    return { label: label, value: Math.random() };
  }).filter(function() {
    return Math.random() > 0.5;
  }).sort(function(a,b) {
    return d3.ascending(a.label, b.label);
  });
}

// ==============|||||||||||===================

var svg = d3.select("#chart")
  .append("svg")
  .append("g");

svg.append("g")
  .attr("class", "slices");
svg.append("g")
  .attr("class", "labels");
svg.append("g")
  .attr("class", "lines");

svg.append("text")
   .attr("text-anchor", "middle")
   .text(getCurrentYear())
   .style({"font-size": "25px"}).classed("centerYear", true);

var width = document.getElementById("chart").offsetWidth,
    height = document.getElementById("chart").offsetHeight;
  radius = Math.min(width-300, height) / 2;
  // -250 because the labels take up space on the left and right

var pie = d3.layout.pie()
  .sort(null)
  .value(function(d) {
    return d.value;
  });

var arc = d3.svg.arc()
  .outerRadius(radius * 0.8)
  .innerRadius(radius * 0.4);

var outerArc = d3.svg.arc()
  .innerRadius(radius * 0.9)
  .outerRadius(radius * 0.9);

svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var key = function(d){ return d.data.label; };

initializeChart();

function mergeWithFirstEqualZero(first, second){
  var secondSet = d3.set(); second.forEach(function(d) { secondSet.add(d.label); });

  var onlyFirst = first
    .filter(function(d){ return !secondSet.has(d.label); })
    .map(function(d) { return {label: d.label, value: 0}; });
  return d3.merge([ second, onlyFirst ])
    .sort(function(a,b) {
      return d3.ascending(a.label, b.label);
    });
}

function change(data) {
  var duration = transitionTime;
  var data0 = svg.select(".slices").selectAll("path.slice")
    .data().map(function(d) { return d.data; });
  if (data0.length === 0) data0 = data;
  var was = mergeWithFirstEqualZero(data, data0);
  var is = mergeWithFirstEqualZero(data0, data);

  /* ------- SLICE ARCS -------*/

  var slice = svg.select(".slices").selectAll("path.slice")
    .data(pie(was), key);

  slice.enter()
    .insert("path")
    .attr("class", "slice")
    .style("fill", function(d) { return color(d.data.label); })
    .each(function(d) {
      this._current = d;
    });

  slice = svg.select(".slices").selectAll("path.slice")
    .data(pie(is), key);

  slice
    .transition().duration(duration)
    .attrTween("d", function(d) {
      var interpolate = d3.interpolate(this._current, d);
      var _this = this;
      return function(t) {
        _this._current = interpolate(t);
        return arc(_this._current);
      };
    });

  slice = svg.select(".slices").selectAll("path.slice")
    .data(pie(data), key);

  slice
    .exit().transition().delay(duration).duration(0)
    .remove();

  /* ------- TEXT LABELS -------*/

  var text = svg.select(".labels").selectAll("text")
    .data(pie(was), key);

  text.enter()
    .append("text")
    .attr("dy", ".35em")
    .style("opacity", 0)
    .text(function(d) {
      return d.data.label;
    })
    .each(function(d) {
      this._current = d;
    });

  function midAngle(d){
    return d.startAngle + (d.endAngle - d.startAngle)/2;
  }

  text = svg.select(".labels").selectAll("text")
    .data(pie(is), key).text(function(d) {
      return d.data.label+": $"+d.data.value;
    });

  svg.select(".centerYear")
   .text(getCurrentYear());

  text.transition().duration(duration)
    .style("opacity", function(d) {
      return d.data.value === 0 ? 0 : 1;
    })
    .attrTween("transform", function(d) {
      var interpolate = d3.interpolate(this._current, d);
      var _this = this;
      return function(t) {
        var d2 = interpolate(t);
        _this._current = d2;
        var pos = outerArc.centroid(d2);
        pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
        return "translate("+ pos +")";
      };
    })
    .styleTween("text-anchor", function(d){
      var interpolate = d3.interpolate(this._current, d);
      return function(t) {
        var d2 = interpolate(t);
        return midAngle(d2) < Math.PI ? "start":"end";
      };
    });

  text = svg.select(".labels").selectAll("text")
    .data(pie(data), key);

  text
    .exit().transition().delay(duration)
    .remove();

  /* ------- SLICE TO TEXT POLYLINES -------*/

  var polyline = svg.select(".lines").selectAll("polyline")
    .data(pie(was), key);

  polyline.enter()
    .append("polyline")
    .style("opacity", 0)
    .each(function(d) {
      this._current = d;
    });

  polyline = svg.select(".lines").selectAll("polyline")
    .data(pie(is), key);

  polyline.transition().duration(duration)
    .style("opacity", function(d) {
      return d.data.value === 0 ? 0 : 0.5;
    })
    .attrTween("points", function(d){
      this._current = this._current;
      var interpolate = d3.interpolate(this._current, d);
      var _this = this;
      return function(t) {
        var d2 = interpolate(t);
        _this._current = d2;
        var pos = outerArc.centroid(d2);
        pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
        return [arc.centroid(d2), outerArc.centroid(d2), pos];
      };
    });

  polyline = svg.select(".lines").selectAll("polyline")
    .data(pie(data), key);

  polyline
    .exit().transition().delay(duration)
    .remove();
}