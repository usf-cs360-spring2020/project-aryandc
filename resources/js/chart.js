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
        .text("Neighborhood: " + location)

    barchart.selectAll("text#chart_year")
        .data(category)
        .enter().append("text")
        .attr("id", "chart_year")
        .attr("x", barchartwidth / 2)
        .attr("y", barchartheight + margin.top / 2 + 10)
        .style("font-size", "10px")
        .text("2019")

    var main_data = data;

    if (category === "All") {
        data = data.filter(function (d) {
            return d.analysis_neighborhood == location;
        });
    } else {
        data = data.filter(function (d) {
            return d.incident_category == category && d.analysis_neighborhood == location;
        });
    }

    data = formatChartData(data);

    let countMin = 0;
    let arr = [];
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
        .attr("transform", "translate(" + (barchartwidth - 20) + " ," + margin.top + ")")
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

    //make bars
    var bars = barchart.selectAll(".bar").data(data);

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
        tooltip.style("opacity", 1)
    }
    var mousemove = function (d) {
        var coords = [d3.event.clientX, d3.event.clientY];
        var top = coords[1] - d3.select("#d3implementation").node().getBoundingClientRect().y + 20,
            left = coords[0] - d3.select("#d3implementation").node().getBoundingClientRect().x + 10;
        var html = `
        <table border="0" cellspacing="0" cellpadding="2">
        <tbody>
        <tr>
            <th>Neighborhood:</th>
            <td class="text">${location}</td>
        </tr>
        <tr>
            <th>Year:</th>
            <td class="text">${year}</td>
        </tr>
        <tr>
            <th>${category} Cases Count:</th>
            <td class="text">${d}</td>
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
        tooltip.style("opacity", 0)
    }

    console.log("bars", bars)
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function (d, i) {
            return xScale(months[i]);
        })
        .attr("width", xScale.bandwidth())
        .attr("y", function (d, i) {
            return yScale(d.value);
        })
        .attr("height", function (d, i) {
            // console.log("HKJDGSHKDS", d)
            return barchartheight - yScale(d.value);
        })

    d3.select("#barchart").selectAll("rect")
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseleave);

    // Update old ones, already have x / width from before
    bars
        .transition().duration(700)
        .attr("y", function (d, i) {
            return yScale(d.value);
        })
        .attr("height", function (d, i) {
            return barchartheight - yScale(d.value);
        });

    // Remove old ones
    bars.exit().remove();
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