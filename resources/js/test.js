function drawMapChart() {
    let svg = d3.select("body")
        .select("#vis")

    let urls = {
        basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson",
        cases: "https://data.sfgov.org/resource/wg3w-h783.json"
    };

    const end = d3.timeDay(new Date(2020, 04, 1));
    const start = d3.timeDay(new Date(2018, 12, 1))
    const format = d3.timeFormat("%Y-%m-%dT%H:%M:%S");
    console.log(format(start), format(end));
    // const end = d3.timeDay(new Date(2019, 11, 31));
    // const start = d3.timeDay(new Date(2018, 12, 1));
    // const format = d3.timeFormat("%Y-%m-%dT%H:%M:%S");
    // console.log(format(start), format(end));

    var formatTimeHour = d3.timeFormat("%H");
    var formatTimeDay = d3.timeFormat("%u");

    // add parameters to url
    urls.cases += "?$limit=100000&$where=starts_with(incident_category, 'Assault')";
    urls.cases += " AND incident_datetime between '" + format(start) + "'";
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

    const promises = [];

    Object.values(urls).forEach(function (url, index) {
        promises.push(d3.json(url));
    });
    Promise.all(promises).then(function (data) {
        // console.log(data); //check if all data was loaded
        projection.fitExtent([[0, 0], [400, 600]], data[0]);
        data[1] = formatDataForMap(data[1])
        console.log(data)
        // visualizeMap(data);
    });
    // setup projection
    window.projection = d3.geoNaturalEarth1();
    // setup path generator (note it is a GEO path, not a normal path)
    window.path = d3.geoPath().projection(projection);
}

function formatDataForMap(data) {
    // console.log(data);
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

