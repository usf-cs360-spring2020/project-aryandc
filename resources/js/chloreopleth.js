var dataset;

const urls = {
  basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson",
  cases: "https://data.sfgov.org/resource/wg3w-h783.json"
};

const end = d3.timeDay(new Date(2020, 04, 1));
const start = d3.timeDay(new Date(2018, 12, 1))
const format = d3.timeFormat("%Y-%m-%dT%H:%M:%S");
console.log(format(start), format(end));

var formatTimeHour = d3.timeFormat("%H");
var formatTimeDay = d3.timeFormat("%u");

var Category = "Assault";
var incidentType = [
  "Assault",
  "Arson",
  "Burglary",
  "Case Closure",
  "Civil Sidewalks",
  "Courtest Report",
  "Disorderly Conduct",
  "Drug Offense",
  "Drug Violation",
  "Embezzlement",
  "Family Offense",
  "Fire Report",
  "Forgery and Counterfeiting",
  "Fraud",
  "Gambling",
  "Homicide",
  "Juvenile Offenses",
  "Larceny Theft",
  "Liquor Laws",
  "Lost Property",
  "Mallicious Mischief",
  "Miscellaneous Investigation",
  "Missing Person",
  "Motor Vehicle Theft",
  "Non-Criminal",
  "Offences Against The Family And Children",
  "Other",
  "Other Offenses",
  "Rape",
  "Robbery"
];

// add parameters to url
urls.cases += "?$limit=200000&$where=";
urls.cases += " incident_datetime between '" + format(start) + "'";
// urls.cases += "?$limit=100000&$where=";
// urls.cases += "incident_datetime between '" + format(start) + "'";
urls.cases += " and '" + format(end) + "'";
urls.cases += " AND analysis_neighborhood not like ''";
urls.cases += " AND analysis_neighborhood not like 'null'";

// output url before encoding
console.log(urls.cases);

// encode special characters
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
urls.cases = encodeURI(urls.cases);
console.log(urls.cases);

//Width and height of map
var width = 600;
var height = 500;

var lowColor = '#fee6db'
var highColor = '#67000d'



var margin = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
}
var active = d3.select(null);

var svg = d3.select("body")
  .select("svg#map")
  .attr("width", width)
  .attr("height", height);

svg.selectAll("text")
  .data([2019, 2020])
  .enter().append("text")
  .attr("x", "20px")
  .attr("y", "20px")
  .style("font-size", "16px")
  .text("2019")

var svg2 = d3.select("body")
  .select("svg#map2")
  .attr("width", width)
  .attr("height", height);

svg2.selectAll("text")
  .data([2019, 2020])
  .enter().append("text")
  .attr("x", "20px")
  .attr("y", "20px")
  .style("font-size", "16px")
  .text("2020")

const g = {
  basemap: svg.select("g#basemap"),
  outline: svg.select("g#outline"),
  cases: svg.select("g#cases"),
  tooltip: svg.select("g#tooltip"),
  details: svg.select("g#details")
};

const g2 = {
  basemap: svg2.select("g#basemap"),
  outline: svg2.select("g#outline"),
  cases: svg2.select("g#cases"),
  tooltip: svg2.select("g#tooltip"),
  details: svg2.select("g#details")
};

// setup tooltip (shows neighborhood name)
const tip = g.tooltip.append("text").attr("id", "tooltip");
tip.attr("text-anchor", "end");
tip.attr("dx", -5);
tip.attr("dy", -5);
tip.style("visibility", "hidden");

const tip2 = g2.tooltip.append("text").attr("id", "tooltip");
tip.attr("text-anchor", "end");
tip.attr("dx", -5);
tip.attr("dy", -5);
tip.style("visibility", "hidden");

var nodes = {};
var nodes2 = {};

// add details widget
// https://bl.ocks.org/mbostock/1424037
const details = g.details.append("foreignObject")
  .attr("id", "details")
  .attr("width", width)
  .attr("height", height)
  .attr("x", 0)
  .attr("y", 0);

const details2 = g2.details.append("foreignObject")
  .attr("id", "details")
  .attr("width", width)
  .attr("height", height)
  .attr("x", 0)
  .attr("y", 0);

const body = details.append("xhtml:body")
  .style("text-align", "left")
  .style("background", "none")
  .html("<p>N/A</p>");

const body2 = details2.append("xhtml:body")
  .style("text-align", "left")
  .style("background", "none")
  .html("<p>N/A</p>");

details.style("visibility", "hidden");
details2.style("visibility", "hidden");

// setup projection
// https://github.com/d3/d3-geo#geoConicEqualArea
const projection = d3.geoConicEqualArea()
  .scale(220)
  .translate([width / 2, height / 2]);

const projection2 = d3.geoConicEqualArea()
  .scale(220)
  .translate([width / 2, height / 2]);

projection.parallels([37.692514, 37.840699]);
projection.rotate([122, 0]);

projection2.parallels([37.692514, 37.840699]);
projection2.rotate([122, 0]);

// setup path generator (note it is a GEO path, not a normal path)
const path = d3.geoPath().projection(projection);

const path2 = d3.geoPath().projection(projection);

function formatDataForMap(data) {
  dataset = data;
  //grouping and sorting of data
  let dataGroup = d3.nest()
    .key(function (d) {
      return d.analysis_neighborhood;
    })
    .rollup(function (v) {
      return v.length;
    })
    .entries(data);

  var out = []
  dataGroup.forEach(function (neighborhood) {
    out.push({
      state: neighborhood.key,
      value: parseInt(neighborhood.value)
    });
  });
  dataGroup = out;

  return dataGroup;
}

d3.json(urls.cases).then(drawMap);

// Load in my states data!
function drawMap(data) {
  // console.log("Initial data", data);

  var main_data = data;

  /* ------temp-------- */
  var allGroup = d3.map(data, function (d) { return (d.incident_year) }).keys()
  // console.log(allGroup);

  data = data.filter(function (d) {
    return d.incident_year == allGroup[0] && d.incident_category == Category;
  });

  d3.select("#categoryButton")
    .selectAll('myOptions')
    .data(incidentType)
    .enter()
    .append('option')
    .text(function (d) { return d; }) // text showed in the menu
    .attr("value", function (d) { return d; }) // corresponding value returned by the button

  dataset = data;

  data = formatDataForMap(data);

  var dataArray = [];
  for (var d = 0; d < data.length; d++) {
    dataArray.push(parseFloat(parseInt(data[d].value) / parseInt(dataset.length) * 100))
  }
  var minVal = d3.min(dataArray)
  var maxVal = d3.max(dataArray)
  var ramp = d3.scaleLinear()
    .domain([minVal, maxVal])
    .range([lowColor, highColor])

  // Load GeoJSON data and merge with states data
  d3.json(urls.basemap).then(function (json) {
    // makes sure to adjust projection to fit all of our regions
    projection.fitSize([width, height], json);
    // Loop through each state data value in the .csv file
    for (var i = 0; i < data.length; i++) {
      // Grab State Name
      var dataState = data[i].state;
      // Grab data value
      var dataValue = parseFloat(parseInt(data[i].value) / parseInt(dataset.length) * 100);
      // Find the corresponding state inside the GeoJSON
      for (var j = 0; j < json.features.length; j++) {
        var jsonState = json.features[j].properties.name;
        if (dataState == jsonState) {
          // console.log("DGHJSKDHGJDK", dataValue);
          // Copy the data value into the JSON
          json.features[j].properties.value = dataValue;
          // Stop looking through the JSON
          break;
        }
      }
    }

    const basemap = g.basemap.selectAll("path.land")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "land")
      .style("fill", function (d) {
        return ramp(d.properties.value)
      })

    const outline = g.outline.selectAll("path.neighborhood")
      .data(json.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("class", "neighborhood")
      .style("fill", function (d) {
        return ramp(d.properties.value)
      })
      .style("stroke", "black")
      .style("stroke-width", 0.5)
      .each(function (d) {
        // save selection in data for interactivity
        // saves search time finding the right outline later
        d.properties.outline = this;
      });

    // add highlight
    basemap.on("mouseover.highlight", function (d) {
      d3.select(d.properties.outline).raise();
      d3.select(d.properties.outline).classed("active", true);
    })
      .on("mouseout.highlight", function (d) {
        d3.select(d.properties.outline).classed("active", false);
      });

    // add tooltip
    basemap.on("mouseover.tooltip", function (d) {
      tip.text(d.properties.name);
      tip.style("visibility", "visible");
    })
      .on("mousemove.tooltip", function (d) {
        const coords = d3.mouse(g.basemap.node());
        tip.attr("x", coords[0]);
        tip.attr("y", coords[1]);
      })
      .on("mouseout.tooltip", function (d) {
        tip.style("visibility", "hidden");
      });

    basemap.on("click", clicked);

    /* -----LEGEND----- */
    drawLegend();
    drawMap2(main_data);
    /* -----LEGEND----- */
  });

  function drawLegend() {
    var w = 140,
      h = 300;

    var key = d3.select("body")
      .append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("class", "legend");

    var legend = key.append("defs")
      .append("svg:linearGradient")
      .attr("id", "gradient")
      .attr("x1", "100%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%")
      .attr("spreadMethod", "pad");

    key.append("text")
      .attr("x", "0px")
      .attr("y", "10px")
      .style("font-size", "14px")
      .text("percent");

    legend.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", highColor)
      .attr("stop-opacity", 1);

    legend.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", lowColor)
      .attr("stop-opacity", 1);

    key.append("rect")
      .attr("width", w - 100)
      .attr("height", h - 10)
      .style("fill", "url(#gradient)")
      .attr("transform", "translate(0,20)");

    var y = d3.scaleLinear()
      .range([h - 21, 0])
      .domain([minVal, maxVal]);

    var yAxis = d3.axisRight(y);

    key.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(41,20)")
      .call(yAxis)
  }

  function drawMap2(data) {

    console.log("ENTER MAP2");
    var main_data = data;

    /* ------temp-------- */
    var allGroup = d3.map(data, function (d) { return (d.incident_year) }).keys()
    // console.log(allGroup);

    data = data.filter(function (d) {
      return d.incident_year == allGroup[1] && d.incident_category == Category;
    });

    dataset = data;

    data = formatDataForMap(data);

    var dataArray = [];
    for (var d = 0; d < data.length; d++) {
      dataArray.push(parseFloat(parseInt(data[d].value) / parseInt(dataset.length) * 100))
    }
    var minVal = d3.min(dataArray)
    var maxVal = d3.max(dataArray)
    var ramp = d3.scaleLinear()
      .domain([minVal, maxVal])
      .range([lowColor, highColor])

    // Load GeoJSON data and merge with states data
    d3.json(urls.basemap).then(function (json) {
      // console.log(json);

      // makes sure to adjust projection to fit all of our regions
      projection2.fitSize([width, height], json);

      // Loop through each state data value in the .csv file
      for (var i = 0; i < data.length; i++) {

        // Grab State Name
        var dataState = data[i].state;

        // Grab data value
        var dataValue = parseFloat(parseInt(data[i].value) / parseInt(dataset.length) * 100);

        // Find the corresponding state inside the GeoJSON
        for (var j = 0; j < json.features.length; j++) {
          var jsonState = json.features[j].properties.name;

          if (dataState == jsonState) {
            // console.log("DGHJSKDHGJDK", dataValue);
            // Copy the data value into the JSON
            json.features[j].properties.value = dataValue;

            // Stop looking through the JSON
            break;
          }
        }
      }

      // console.log("json.features", json.features);

      const basemap = g2.basemap.selectAll("path.land")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "land")
        .style("fill", function (d) {
          return ramp(d.properties.value)
        })

      const outline = g2.outline.selectAll("path.neighborhood")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "neighborhood")
        .style("fill", function (d) {
          return ramp(d.properties.value)
        })
        .style("stroke", "black")
        .style("stroke-width", 0.5)
        .each(function (d) {
          // save selection in data for interactivity
          // saves search time finding the right outline later
          d.properties.outline = this;
        });

      // add highlight
      basemap.on("mouseover.highlight", function (d) {
        d3.select(d.properties.outline).raise();
        d3.select(d.properties.outline).classed("active", true);
      })
        .on("mouseout.highlight", function (d) {
          d3.select(d.properties.outline).classed("active", false);
        });

      // add tooltip
      basemap.on("mouseover.tooltip", function (d) {
        tip2.text(d.properties.name);
        tip2.style("visibility", "visible");
      })
        .on("mousemove.tooltip", function (d) {
          const coords = d3.mouse(g2.basemap.node());
          tip2.attr("x", coords[0]);
          tip2.attr("y", coords[1]);
        })
        .on("mouseout.tooltip", function (d) {
          tip2.style("visibility", "hidden");
        });

      basemap.on("click", clicked);

      /* -----LEGEND----- */
      drawLegend();
      /* -----LEGEND----- */

      console.log("EXIT MAP 2");
    });
  }

  function updateCategory(selectedGroup, cat) {

    formatTimeHour = d3.timeFormat("%H");
    formatTimeDay = d3.timeFormat("%u");

    // add parameters to url
    urls.cases = "https://data.sfgov.org/resource/wg3w-h783.json"
    urls.cases += "?$limit=100000&$where=starts_with(incident_category, '" + cat + "')";
    urls.cases += " AND incident_datetime between '" + format(start) + "'";
    urls.cases += " and '" + format(end) + "'";
    urls.cases += " AND analysis_neighborhood not like ''";
    urls.cases += " AND analysis_neighborhood not like 'null'";
    urls.cases = encodeURI(urls.cases);


    d3.json(urls.cases).then(function (data) {
      var main_data = data;
      updateCategory2(data, cat);

      var dataFilter = main_data.filter(function (d) {
        return d.incident_year == selectedGroup && d.incident_category == cat;
      })

      data = dataFilter;
      var dataset = data;
      data = formatDataForMap(data);

      // console.log(data);

      dataArray = [];
      for (var d = 0; d < data.length; d++) {
        dataArray.push(parseFloat(parseInt(data[d].value) / parseInt(dataset.length) * 100))
      }

      var minVal = d3.min(dataArray)
      var maxVal = d3.max(dataArray)
      var ramp = d3.scaleLinear()
        .domain([minVal, maxVal])
        .range([lowColor, highColor])


      // BASEMAP
      d3.json(urls.basemap).then(function (json) {
        // makes sure to adjust projection to fit all of our regions
        projection.fitSize([width, height], json);

        // Loop through each state data value in the .csv file
        for (var i = 0; i < data.length; i++) {

          // Grab State Name
          var dataState = data[i].state;

          // Grab data value
          var dataValue = parseFloat(parseInt(data[i].value) / parseInt(dataset.length) * 100);

          // Find the corresponding state inside the GeoJSON
          for (var j = 0; j < json.features.length; j++) {
            var jsonState = json.features[j].properties.name;

            if (dataState == jsonState) {
              // console.log("DGHJSKDHGJDK", dataValue);
              // Copy the data value into the JSON
              json.features[j].properties.value = dataValue;

              // Stop looking through the JSON
              break;
            }
          }
        }

        const outline = g.outline.selectAll("path.neighborhood")
          .data(json.features)
          .transition().duration(700)
          .style("fill", function (d) {
            return ramp(d.properties.value)
          })
          .style("stroke", "black")
          .style("stroke-width", 0.5)
          .each(function (d) {
            // save selection in data for interactivity
            // saves search time finding the right outline later
            d.properties.outline = this;
          });
      });

    });

  }

  function updateCategory2(data, cat) {
    var main_data = data;

    var dataFilter = main_data.filter(function (d) {
      return d.incident_year == "2020" && d.incident_category == cat;
    })

    data = dataFilter;
    var dataset = data;
    data = formatDataForMap(data);

    console.log("second data", data);

    dataArray = [];
    for (var d = 0; d < data.length; d++) {
      dataArray.push(parseFloat(parseInt(data[d].value) / parseInt(dataset.length) * 100))
    }

    var minVal = d3.min(dataArray)
    var maxVal = d3.max(dataArray)
    var ramp = d3.scaleLinear()
      .domain([minVal, maxVal])
      .range([lowColor, highColor])

    d3.json(urls.basemap).then(function (json) {
      projection2.fitSize([width, height], json);

      for (var i = 0; i < data.length; i++) {
        // Grab State Name
        var dataState = data[i].state;
        // Grab data value
        var dataValue = parseFloat(parseInt(data[i].value) / parseInt(dataset.length) * 100);
        // Find the corresponding state inside the GeoJSON
        for (var j = 0; j < json.features.length; j++) {
          var jsonState = json.features[j].properties.name;

          if (dataState == jsonState) {
            // console.log("DGHJSKDHGJDK", dataValue);
            // Copy the data value into the JSON
            json.features[j].properties.value = dataValue;

            // Stop looking through the JSON
            break;
          }
        }
      }

      const outline = g2.outline.selectAll("path.neighborhood")
        .data(json.features)
        .transition().duration(700)
        .style("fill", function (d) {
          return ramp(d.properties.value)
        })
        .style("stroke", "black")
        .style("stroke-width", 0.5)
        .each(function (d) {
          // save selection in data for interactivity
          // saves search time finding the right outline later
          d.properties.outline = this;
        });
    });
  }

  d3.select("#categoryButton").on("change", function (d) {
    // recover the option that has been chosen
    var selected_category = d3.select(this).property("value")
    // console.log("car, year", [selected_category, selected_year]);
    // run the updateChart function with this selected option
    Category = selected_category;
    updateCategory("2019", selected_category);
  })

}


function clicked(d) {
  if (d3.select('.background').node() === this) return reset();

  if (active.node() === this) return reset();

  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
    dx = bounds[1][0] - bounds[0][0],
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    scale = .9 / Math.max(dx / width, dy / height),
    translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.selectAll("g").transition()
    .duration(750)
    .style("stroke-width", 1.5 / scale + "px")
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

  svg2.selectAll("g").transition()
    .duration(750)
    .style("stroke-width", 1.5 / scale + "px")
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.selectAll("g").transition()
    .delay(100)
    .duration(750)
    .style("stroke-width", "1.5px")
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  svg2.selectAll("g").transition()
    .delay(100)
    .duration(750)
    .style("stroke-width", "1.5px")
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
}
