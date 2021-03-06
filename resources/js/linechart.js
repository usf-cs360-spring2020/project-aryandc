var margin = {
    top: 50,
    right: 0,
    bottom: 50,
    left: 40
},
    svgwidth = 1200,
    svgheight = 300,
    barchartwidth = svgwidth - margin.left - margin.right,
    barchartheight = svgheight - margin.top - margin.bottom;

var months = ["January 2019", "February 2019", "March 2019", "April 2019", "May 2019",
    "June 2019", "July 2019", "August 2019", "September 2019", "October 2019", "November 2019", "December 2019", "January 2020", "February 2020", "March 2020", "April 2020"
];


var formatTimeMonth = d3.timeFormat("%B");

function formatChartData(data) {
    //grouping and sorting of data
    let dataGroup = d3.nest()
        .key(function (d) {
            return d.incident_year;
        })
        .key(function (d) {
            return formatTimeMonth(new Date(d.incident_datetime));
        })
        .sortKeys(function (a, b) {
            return months.indexOf(a) - months.indexOf(b);
        })
        .key(function (d) {
            return parseInt(d.incident_number);
        })
        .rollup(function (v) {
            return v.length;
        })
        .entries(data)
        .map(function (group) {
            return group.values.map(function (subgroup) {
                return {
                    "month": subgroup.key + " " + group.key,
                    "value": subgroup.values.length
                }
            })
        });

    var out = [];
    dataGroup.forEach(function (test) {
        test.forEach(function (police_district) {
            out.push({
                key: police_district.month,
                value: parseInt(police_district.value)
            });
        })
    });
    dataGroup = out;

    return dataGroup;
}

// Create canvas
var barchart =
    d3.select("svg#barchart")
        .attr("width", svgwidth)
        .attr("height", svgheight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function updateBarChart(location, data, year, category) {
    console.log(location);
    barchart.selectAll("text#chart_label").remove();

    barchart.selectAll("text#chart_label")
        .data(category)
        .enter().append("text")
        .attr("id", "chart_label")
        .attr("x", "-20px")
        .attr("y", "-20px")
        .style("font-size", "14px")
        .text("Incident Category: " + category)


    barchart.selectAll("text#chart_neighborhood").remove();

    barchart.selectAll("text#chart_neighborhood")
        .data(category)
        .enter().append("text")
        .attr("id", "chart_neighborhood")
        .attr("x", "-20px")
        .attr("y", "-35px")
        .style("font-size", "14px")
        .attr("text-anchor", "start")
        .text("Police District: " + location)

    if (category === "All") {
        data = data.filter(function (d) {
            return d.police_district == toTitleCase(location);
        });
    } else {
        data = data.filter(function (d) {
            return d.incident_category == category && d.police_district == toTitleCase(location);
        });
    }

    data = formatChartData(data);

    let countMin = 0;
    let countMax = d3.max(data, function (d) {
        return d.value;
    });

    if (isNaN(countMax)) {
        countMax = 0;
    }

    // reset x and y axis
    d3.select("svg#barchart").select("g.x-axis").remove();
    d3.select("svg#barchart").select("g.y-axis").remove();

    // Make x scale
    var xScale = d3.scaleBand()
        .domain(months)
        .range([0, barchartwidth])
        .padding(0.1);

    // Make y scale, the domain will be defined on bar update
    var yScale = d3.scaleLinear()
        .domain([countMin, countMax])
        .range([barchartheight, 0])
        .nice();


    // Make x-axis and add to canvas
    var xAxis = d3.axisBottom(xScale).tickSizeOuter(0).tickFormat(monthFormatter);

    var xAxis = barchart.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + barchartheight + ")")
        .call(xAxis);

    xAxis.append("text")
        .attr("transform", "translate(" + (barchartwidth / 2) + " ," + margin.top + ")")
        .style("text-anchor", "middle")
        .style("fill", "black")
        .text("Month");

    // Make y-axis and add to canvas
    var yAxis = d3.axisLeft(yScale);

    var yAxisHandleForUpdate = barchart.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

    yAxisHandleForUpdate.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (barchartheight / 2))
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .style("fill", "black")
        .text("Incident Count");

    const line = d3.line()
        .defined(function (d) {
            return d.value;
        })
        .x((d, i) => xScale.bandwidth() / 2 + xScale(months[monthIndex(d.key)]))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX)

    var linepath = barchart.append('path')
        .datum(data)
        .attr("class", "line")
        // .style('stroke', '#1d7eb6')
        .style("stroke", "white")
        .style('stroke-width', 2)
        .style('fill', 'none')
        .attr('d', line)

    var linedot = barchart.selectAll(".dot")
        .data(data)
        .enter().append("circle") // Uses the enter().append() method
        .attr("class", "dot") // Assign a class for styling
        .attr("cx", function (d, i) { return xScale.bandwidth() / 2 + xScale(months[monthIndex(d.key)]) })
        .attr("cy", function (d) { return yScale(d.value) })
        .attr("r", 5)
        .style('fill', 'white')

    // create a tooltip
    var tooltip = d3.select("#div_barchart")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
        tooltip.style("opacity", 1);

        let basemap_year = d.key.substring(d.key.length - 4);
        console.log(basemap_year)

        if (basemap_year === "2019") {

            d3.selectAll("path.land").filter(function (e) {
                // console.log([location, toTitleCase(e.properties.district)])
                return toTitleCase(location) === toTitleCase(e.properties.district);
            })
                .select(e => e.properties.outline)
                .raise()
                .classed("active", true);

        } else if (basemap_year === "2020") {

            d3.selectAll("path.land2").filter(function (e) {
                return toTitleCase(location) === toTitleCase(e.properties.district);
            })
                .select(e => e.properties.outline)
                .raise()
                .classed("active", true);

        }

    }
    var mousemove = function (d) {

        var coords = [d3.event.clientX, d3.event.clientY];
        var top = coords[1] - d3.select("#d3implementation").node().getBoundingClientRect().y + 20,
            left = coords[0] - d3.select("#d3implementation").node().getBoundingClientRect().x + 10;
        var html = `
        <table border="0" cellspacing="0" cellpadding="2">
        <tbody>
        <tr>
            <th>Police District:</th>
            <td class="text">${toTitleCase(location)}</td>
        </tr>
        <tr>
            <th>Date:</th>
            <td class="text">${d.key}</td>
        </tr>
        <tr>
            <th>${category} Cases Count:</th>
            <td class="text">${d.value}</td>
        </tr>
        </tbody>
        </table>
    `;
        tooltip
            .html(html)
            .style("left", left + "px")
            .style("top", top + "px")
    }
    var mouseleave = function (d) {


        d3.selectAll("path.land2").filter(function (e) {
            return toTitleCase(location) === toTitleCase(e.properties.district);
        })
            .select(e => e.properties.outline)
            .classed("active", false);

        d3.selectAll("path.land").filter(function (e) {
            return toTitleCase(location) === toTitleCase(e.properties.district);
        })
            .select(e => e.properties.outline)
            .classed("active", false);

        tooltip.style("opacity", 0)
    }

    d3.select("#barchart").selectAll(".dot")
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseleave);

    barchart.selectAll('.line')
        .datum(data)
        .transition().duration(500)
        .style("stroke", "#1d7eb6")
        .attr('d', line)

    barchart.selectAll(".dot")
        .data(data)
        .transition().duration(500)
        .attr("cx", function (d, i) { return xScale.bandwidth() / 2 + xScale(months[monthIndex(d.key)]) })
        .attr("cy", function (d) { return yScale(d.value) })
        .style('fill', '#1d7eb6')
};

function monthFormatter(month) {
    if (month == "January 2019") {
        return "Jan 2019";
    } else if (month == "February 2019") {
        return "Feb 2019"
    } else if (month == "March 2019") {
        return "Mar 2019"
    } else if (month == "April 2019") {
        return "Apr 2019"
    } else if (month == "May 2019") {
        return "May 2019"
    } else if (month == "June 2019") {
        return "June 2019"
    } else if (month == "July 2019") {
        return "July 2019"
    } else if (month == "August 2019") {
        return "Aug 2019"
    } else if (month == "September 2019") {
        return "Sept 2019"
    } else if (month == "October 2019") {
        return "Oct 2019"
    } else if (month == "November 2019") {
        return "Nov 2019"
    } else if (month == "December 2019") {
        return "Dec 2019"
    } else if (month == "January 2020") {
        return "Jan 2020";
    } else if (month == "February 2020") {
        return "Feb 2020"
    } else if (month == "March 2020") {
        return "Mar 2020"
    } else if (month == "April 2020") {
        return "Apr 2020"
    }
    return month;
}

function monthIndex(month) {
    if (month == "January 2019") {
        return 0;
    } else if (month == "February 2019") {
        return 1
    } else if (month == "March 2019") {
        return 2
    } else if (month == "April 2019") {
        return 3
    } else if (month == "May 2019") {
        return 4
    } else if (month == "June 2019") {
        return 5
    } else if (month == "July 2019") {
        return 6
    } else if (month == "August 2019") {
        return 7
    } else if (month == "September 2019") {
        return 8
    } else if (month == "October 2019") {
        return 9
    } else if (month == "November 2019") {
        return 10
    } else if (month == "December 2019") {
        return 11
    } else if (month == "January 2020") {
        return 12
    } else if (month == "February 2020") {
        return 13
    } else if (month == "March 2020") {
        return 14
    } else if (month == "April 2020") {
        return 15
    }
    return month;
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}