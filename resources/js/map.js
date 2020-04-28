function drawMap() {
    const urls = {
        basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson",
        streets: "https://data.sfgov.org/resource/3psu-pn9h.geojson?$limit=20000",
        cases: "https://data.sfgov.org/resource/wg3w-h783.json"
    };
    // console.log("data loaded");

    let config = {
        'svg': {},
        'margin': {},
        'plot': {}
    };
    
    let width = 960;
    let height = 500;

    //calculate date range
    const end = d3.timeDay(new Date(2020, 3, 1));
    const start = d3.timeDay(new Date(2020, 1, 1));
    const format = d3.timeFormat("%Y-%m-%dT%H:%M:%S");
    const dateFormat = d3.timeFormat("%B %d, %Y");
    const dayFormat = d3.timeFormat("%d");
    const monthFormatter = d3.timeFormat("%B");
    console.log(format(start), format(end));
    // console.log("months", d3.timeMonths(start, end));

    urls.cases += "?$limit=5000&$where=starts_with(incident_category, 'Assault')";
    urls.cases += "AND starts_with(incident_subcategory, 'Aggravated Assault')";//922067
    urls.cases += " AND incident_datetime between '" + format(start) + "'";
    urls.cases += " and '" + format(end) + "'";
    

    //output url before encoding
    // console.log("cases:", urls.cases);
    urls.cases = encodeURI(urls.cases);
    // console.log(urls.cases);

    const svg = d3.select('body').select('svg#betamap1')
        .attr('style', "outline: thin solid lightgrey")
        .on("click", reset);

    // zooming ability
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

    //plot area
    let plot = svg.select('g#plot')
        .attr('id', 'plot')
        .style('background', 'blue')
        .attr('transform', translate(80, 10));

    const g = {
        basemap: plot.select('g#basemap'),
        streets: plot.select('g#streets'),
        outline: plot.select('g#outline'),
        arrests: plot.select('g#arrests'),
        details: plot.select('g#detaile'),
        tooltip: plot.select('g#tooltip'),
        legend: plot.select('g#legend')
    };
    // console.log("groups created!");

    const details = g.details.append('foreignObject')
        .attr('id', 'details')
        .attr('width', width)
        .attr('height', height)
        .attr('x', 0)
        .attr('y', 0);

    const tooltip = g.tooltip.append('foreignObject')
        .attr('id', 'tooltip') 
        .attr('width', width)
        .attr('height', height)
        .attr('x', 0)
        .attr('y', 0);

    const tip = g.tooltip.append("text").attr("id", "tooltip");
        tip.attr("text-anchor", "end");
        tip.attr("dx", -5);
        tip.attr("dy", -5);
        tip.style("visibility", "hidden");

    const body = details.append("xhtml:body")
        .style('text-align', "left")
        .style("background", "none")
        .html("<p>N/A</p>");

    details.style("visibility", "hidden");

    const projection = d3.geoConicEqualArea()
        .parallels([37.692514, 37.840699])
        .rotate([122, 0]);

    const path = d3.geoPath().projection(projection);

    d3.json(urls.basemap).then(function(json) {
        projection.fitSize([width, height], json);
        
        drawBasemap(json);

        d3.json(urls.streets).then(drawStreets);
        d3.json(urls.cases).then(drawArrests);
        svg.call(zoom);
    });

    function drawBasemap(json) {
        const basemap = g.basemap.selectAll("path.land")
            .data(json.features)
            .enter().append("path")
                .on("click", clicked)
                .attr("d", path)
                .attr("class", "land");
        
        const outline = g.outline.selectAll("path.neighborhood")
            .data(json.features)
            .enter().append("path")
                .attr("d", path)
                .attr("class", "neighborhood")
                .each(function(d) {
                    d.properties.outline = this;
                    d.properties.centroid = path.centroid(d);
                });

        basemap.on("mouseover.highlight", function(d) {
            d3.select(d.properties.outline).raise();
            d3.select(d.properties.outline).classed("active", true);
        })
        .on("mouseout.highlight", function(d) {
            d3.select(d.properties.outline).classed("active", false);
        });

        // //tooltip
        basemap.on("mouseover.tooltip", function(d) {
            tip.text(d.properties.name);
            tip.style("visibility", "visible");
          })
          .on("mousemove.tooltip", function(d) {
            const coords = d3.mouse(g.basemap.node());
            tip.attr("x", coords[0]);
            tip.attr("y", coords[1]);
          })
          .on("mouseout.tooltip", function(d) {
            tip.style("visibility", "hidden");
          });
    }

    function drawStreets(json) {
        // console.log("streets", json);

        const streets = json.features.filter(function(d) {
            return d;
        });

        // console.log("removed", json.features.length - streets.length, "inactive streets");

        g.streets.selectAll("path.street")
            .data(streets)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "street");
    }
    
    function drawArrests(json) {
        let color = d3.scaleOrdinal(d3.schemeCategory10);
        
        json.forEach(function(d) {
            if (d.latitude != null && d.longitude != null && d.analysis_neighborhood != null) {
                const latitude = parseFloat(d.latitude);
                const longitude = parseFloat(d.longitude);
                const pixels = projection([longitude, latitude]);
                d.x = pixels[0];
                d.y = pixels[1];
                d.year = parseInt(d.incident_year);
                d.day = parseInt(dayFormat(new Date(d.incident_datetime)));
                d.month = monthFormatter(new Date(d.incident_datetime));
                d.subcategory = d.incident_subcategory;
            }
        }); 

        console.log("arrests", json);

        // createSlider(json);

        const symbols = g.arrests.selectAll("circle")
            .data(json)
            .enter().append("circle")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", 5)
                .attr("fill", function(d) {
                    // console.log(monthFormatter(new Date(d.incident_datetime)));
                    return color(monthFormatter(new Date(d.incident_datetime)));
                })
                .attr("class", "symbol");

        symbols.on("mouseover.hover", function(d) {
            d3.select(this).raise();
            d3.select(this).style("stroke", "black");
            d3.select(this).classed("active-small", true);

            let div = d3.select("body").append("div");

            div.attr("id", "details")
                .attr("class", "tooltip");

            let dataNew = createTooltip(Object(d));

            let rows = div
                .append("taablenew")
                .selectAll("tr")
                    .data(Object.keys(dataNew))
                    .enter()
                    .append('tr');

            rows.append("th").text(key => key);
            rows.append("td").text(key => dataNew[key]);
            div.style("display", "inline");
        });

        symbols.on("mousemove.hover", function(d) {
            let div = d3.select("div#details");
            let bbox = div.node().getBoundingClientRect();

            div.style("left", d3.event.pageX + "px");
            div.style("top", (d3.event.pageY - bbox.height) + "px");
        });

        symbols.on("mouseout.hover", function(d) {
            d3.select(this).classed("active-small", false);
            d3.select(this).style("stroke", "");
            d3.selectAll("div#details").remove();
        });

        drawLegend(json);
    }

    function createTooltip(row, index) {
        let out = {};

        for (let col in row) {
            switch (col) {
                case 'incident_id':
                    out['ID:\xa0'] = row[col];
                break;
                case 'analysis_neighborhood':
                    out['Neighborhood:\xa0'] = row[col];
                break;
                case 'incident_datetime':
                    out['Date:\xa0'] = dateFormat(new Date(row[col]));
                break;
                case 'incident_day_of_week':
                    out['Day:\xa0'] = row[col];
                break;
                case 'incident_subcategory':
                    out['Subcategory:\xa0'] = row[col];
                break;
                case 'resolution':
                    out['Case Resolution:\xa0'] = row[col];
                break;
                case 'incident_description':
                    out['Description:\xa0'] = row[col];
                break;
      
              default:
                break;
            }
          }
          return out;
    }

    function updateMap(years) {
        let startYear = years[0];
        let endYear = years[1];
        const symbols = g.arrests.selectAll("circle");

        symbols.filter(d => (monthInNum(d.month) > endYear || monthInNum(d.month) < startYear))
            .transition()
            .style("display", "none");
        symbols.filter(d => (monthInNum(d.month) <= endYear && monthInNum(d.month) >= startYear))
            .raise()
            .transition()
            .style("display", "inline");
    }

    function createSlider(data) {
        // console.log(data);
        let years = new Set(data.map(function(d) {
            // console.log("Year:", d.month);
            return monthInNum(d.month);
        }));
        
        // console.log("Years", years);
        let minYear = 4;
        let maxYear = 0;

        years.forEach(function(d) {
            if (d < minYear) {
                minYear = d;
            }
            if (d > maxYear) {
                maxYear = d;
            }
        });
        // console.log("[minYear, maxYear", [minYear, maxYear]);

        var sliderRange = d3.sliderBottom()
            .min(minYear)
            .max(maxYear)
            .step(1)
            .width(500)
            .tickValues(years)
            .default([0, 3])
            .fill('#2196f3')
            .on('onchange', value => {
                d3.select('p#value-simple').text(intInMonths(value[0]) + " - " +  intInMonths(value[1]));
                updateMap(value);
            });

        var gTime = d3
            .select('div#slider-simple')
            .append('svg')
            .attr('width', 550)
            .attr('height', 100)
            .append('g')
            .attr('transform', 'translate(30,30)');

        gTime.call(sliderRange);

        d3.select('p#value-simple').text(
            intInMonths(sliderRange.value()[0]) + " - " +  intInMonths(sliderRange.value()[1])
        );
    }

    function drawLegend(json) {
        var legendsvg = d3.select("body").select("g#legend")
            .attr("width", 400)
            .attr("height", 500);

        var colors = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(["January", "February", "March", "April", "May", "June", "July", "September", "October", "November", "December"]);

        var legendText = ["January", "February", "March", "April", "May", "June", "July", "September", "October", "November", "December"];

        var legend = legendsvg.selectAll("g.legend")
            .data(["0"])
            .enter().append("g")
                .attr("class", "legend")
                .attr("transform", translate(850,300));

        //heading
        legend.append("text")
      .attr("x", 0)
      .attr("y", 10)
      .text("Month")
      .style("font-size", "16px")
      .attr("alignment-baseline","middle");

        //colors with text
        legend.append("circle")
        .attr("class", "leg")
        .attr("cx", 10)
        .attr("cy", 40)
        .attr("r", 5)
        .style("fill", colors("January"))
        .on("click", function(){ 
            filterCircle("March");
            const legendCell = d3.select(this);
            legendCell.classed('hidden', !legendCell.classed('hidden')); // toggle opacity of legend item
        });

        legend.append("circle")
        .attr("class", "leg")
        .attr("cx", 10)
        .attr("cy", 70)
        .attr("r", 5)
        .style("fill", colors("February"))
        .on("click", function(){ 
            filterCircle("April");
            const legendCell = d3.select(this);
            legendCell.classed('hidden', !legendCell.classed('hidden')); // toggle opacity of legend item
        });

        // legend.append("circle")
        // .attr("class", "leg")
        // .attr("cx", 10)
        // .attr("cy", 100)
        // .attr("r", 5)
        // .style("fill", colors("March"))
        // .on("click", function(){
        //     filterCircle("April");
        //     const legendCell = d3.select(this);
        //     legendCell.classed('hidden', !legendCell.classed('hidden')); // toggle opacity of legend item
        // });

        legend.append("text")
        .attr("x", 30)
        .attr("y", 40)
        .text(legendText[2])
        .style("font-size", "11px")
        .attr("alignment-baseline","middle");

        legend.append("text")
        .attr("x", 30)
        .attr("y", 70)
        .text(legendText[3])
        .style("font-size", "11px")
        .attr("alignment-baseline","middle");

        // legend.append("text")
        // .attr("x", 30)
        // .attr("y", 100)
        // .text(legendText[3])
        // .style("font-size", "11px")
        // .attr("alignment-baseline","middle");

    }

    function filterCircle(c) {
        // console.log("C:", c);
        d3.selectAll("#arrests circle")
          .filter(function(d) {
            return d.month != c;
          })
          .classed('hidden', function() { // toggle "hidden" class
            return !d3.select(this).classed('hidden');
          });
    }

    function intInMonths(d) {
        let out;
        switch (d) {
            case 0:
                out = "January";
                break;
            case 1:
                out = "February";
                break;
            case 2:
                out = "March";
                break;
            case 3:
                out = "April";
                break;
            case 4:
                out = "May";
                break;
            case 5:
                out = "June";
                break;
            case 6:
                out = "July";
                break;
            case 7:
                out = "August";
                break;
            case 8:
                out = "September";
                break;
            case 9:
                out = "October";
                break;
            case 10:
                out = "November";
                break;
            case 11:
                out = "December";
                break;
            default:
                out = 0;
                break;
        }
        return out;
    }

    function monthInNum(d) {
        let out;
        switch (d) {
            case "January":
                out = 0;
                break;
            case "February":
                out = 1;
                break;
            case "March":
                out = 2;
                break;
            case "April":
                out = 3;
                break;
            case "May":
                out = 4;
                break;
            case "June":
                out = 5;
                break;
            case "July":
                out = 6;
                break;
            case "August":
                out = 7;
                break;
            case "September":
                out = 8;
                break;
            case "October":
                out = 9;
                break;
            case "November":
                out = 10;
                break;
            case "December":
                out = 11;
                break;
            default:
                out = 0;
                break;
        }
        return out;
      }

    function translate(x, y) {
        return "translate(" + String(x) + "," + String(y) + ")";
    }

    function reset() {
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity,
          d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        );
      }

    function clicked(d) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        d3.event.stopPropagation();
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
          d3.mouse(svg.node())
        );
      }

    function zoomed() {
        const {transform} = d3.event;
        // svg.selectAll('g').attr("transform", transform);
        // svg.selectAll('g').attr("stroke-width", 1 / transform.k);
        
        g.basemap.selectAll('path.land')
            .attr('transform', d3.event.transform);
        g.streets.selectAll('path.street')
            .attr('transform', d3.event.transform);
        g.outline.selectAll('path.neighborhood')
            .attr('transform', d3.event.transform);
        g.arrests.selectAll("circle")
            .attr('transform', d3.event.transform)
            .attr('stroke-width', 0.5 / d3.event.transform.k)
            .attr('r', 5/ d3.event.transform.k)
        g.arrests.selectAll("circle.active")
            .attr('stroke-width', 1 / d3.event.transform.k);
      }
}
