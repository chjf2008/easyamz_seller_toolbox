/**
 * Export data
 */

Helper.export = (function () {

    const processRow = function (row) {
        let finalVal = "";

        for (let j = 0; j < Object.keys(row).length; j++) {
            let innerValue = !(Object.values(row)[j]) ? "" : Object.values(row)[j];

            if (!innerValue) {
                innerValue = '';
            }
            innerValue = innerValue + "";

            //innerValue = innerValue.toString();

            let result = innerValue;


            // replace " and ;
            // let result = innerValue.replace(/"/g, "\"\"").replace(";", ",");
            // if (result.search(/("|,|\n)/g) >= 0) {
            //     result = "\"" + result + "\"";
            // }
            //
            // if (innerValue.search(/("|,|\n)/g) >= 0){
            //     result = '"' + result + '"';
            // }

            result = result.replace(/,/g, " ");
            result = result.replace(/"/g, ' ');


            //console.log(result)

            //innerValue=innerValue.replace(/"/g, '""');

            if (result.indexOf('</span>') > -1) {
                result = '';
            }
            result = result.replace(/\s+/, ' ');


            if (j > 0) {
                finalVal += ",";
            }
            finalVal += result;
        }
        return finalVal + "\r\n";
    };


    function toCSV(filename, rows) {


        let csvFile = '';
        if (rows && rows.length > 0) {
            $.each(Object.keys(rows[0]), function (i, key) {
                csvFile += key + ",";
            });
            csvFile += '\r\n';
        }
        for (let i = 0; i < rows.length; i++) {
            csvFile += processRow(rows[i]);
        }
        //const blob = new Blob(["\uFEFF"+csvFile], {type: "text/csv;charset=utf-8;"});
        const blob = new Blob(["\uFEFF" + csvFile], {type: 'text/csv; charset=utf-18'});

        try {
            const csvUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", csvUrl);
            link.setAttribute("download", filename);
            link.style.visibility = "hidden";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e) {
            console.log(e);
        }
    }

    function toJSON(data, filename) {
        if (!data) {
            return;
        }
        if (!filename)
            filename = 'json.json'
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }
        var blob = new Blob([data], {type: 'text/json'}),
            e = document.createEvent('MouseEvents'),
            a = document.createElement('a')
        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e);
    }


    return {
        toCSV: function (filename, rows) {
            toCSV(filename, rows);
        },
        toJSON: function (data, filename) {
            toJSON(data, filename);
        },

        JSONToCSVConvertor: function (filename, JSONData) {
            //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
            var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
            var CSV = '';
            //This condition will generate the Label/Header

            var row = "";

            //This loop will extract the label from 1st index of on array
            for (var index in arrData[0]) {
                //Now convert each value to string and comma-seprated
                row += index + ',';
            }
            row = row.slice(0, -1);
            //append Label row with line break
            CSV += row + '\r\n';


            //1st loop is to extract each row
            for (var i = 0; i < arrData.length; i++) {
                var row = "";
                //2nd loop will extract each column and convert it in string comma-seprated
                for (var index in arrData[i]) {

                    let val = arrData[i][index];
                    if (!val) {
                        val = "";
                    }

                    val = val + "";
                    if (val && val.indexOf('"') > -1) {
                        val = val.replace(/"/g, '');
                    }
                    val = val.replace(/,/g, " ");
                    row += '"' + val + '",';
                }
                row.slice(0, row.length - 1);
                //add a line break after each row
                CSV += row + '\r\n';
            }

            if (CSV == '') {
                alert("Invalid data");
                return;
            }


            const blob = new Blob(["\uFEFF" + CSV], {type: 'text/csv; charset=utf-18'});

            try {
                const csvUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", csvUrl);
                link.setAttribute("download", filename);
                link.style.visibility = "hidden";

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (e) {
                console.log(e);
            }


            //
            // //this trick will generate a temp "a" tag
            // var link = document.createElement("a");
            // link.id = "lnkDwnldLnk";
            //
            // //this part will append the anchor tag and remove it after automatic click
            // document.body.appendChild(link);
            //
            // var csv = CSV;
            // blob = new Blob([csv], {type: 'text/csv'});
            // var csvUrl = window.webkitURL.createObjectURL(blob);
            // var filename = (ReportTitle || 'UserExport') + '.csv';
            // $("#lnkDwnldLnk")
            //     .attr({
            //         'download': filename,
            //         'href': csvUrl
            //     });
            //
            // $('#lnkDwnldLnk')[0].click();
            // document.body.removeChild(link);

        }
    };
}());
