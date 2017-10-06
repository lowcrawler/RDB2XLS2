function getTrackingCode(worksheet) { 
    // given worksheet, will return the first tracking code located in row 1 (excel sees this as row 2)
    // if not found, will call "fileTrackingErrorCallback with appropriate error message"
    curCol = 1;
    for(let curCol = 1; curCol < 10000; curCol++) {
        curCell = worksheet[X.utils.encode_cell({
            r: 1,
            c: curCol
        })];
        cellValue = (curCell ? curCell.v : undefined);
        if(cellValue != undefined && cellValue.lastIndexOf("TrackingCode_", 0) === 0) {
            return cellValue.substring(13); //13 is the length of the "TrackingCode_" keyword
        }
    }
    fileTrackingErrorCallback("Unable to find the Tracking Code at the end of the second row of the provded file.");
}

function updateStatus(msg) {
    if(document.getElementById("statusArea").classList.contains("hidden")) {
        document.getElementById("statusArea").classList.remove("hidden");
    }
    if(statusOutput.value === undefined) {
        statusOutput.value = " ○ - " + msg;
    } else {
        statusOutput.value += "\n" + " ○ - " + msg;
        statusOutput.scrollTop = statusOutput.scrollHeight; //TODO: only scroll at correct times.
    }
}

function getStringFrom2dArray(arr) {
    //for creation of tab-delimited QWRESULT file
   
    var retString = "";
    for(var i = 0; i < arr.length; i++) {
        for(var j = 0; j < arr[i].length; j++) {
            retString += arr[i][j] + "\t";
        }
        retString = retString.substring(0, retString.lastIndexOf("\t"));
        retString += "\n";
    }
    return retString;
}

////// AJAX //////
// call successCallback with filename that matches the trackingCode
// or
// call errorCallback if the reponseText starst with ERR
function checkIfFileExists(trackingCode, successCallback, errorCallback) {
    var url = "php/oldFile_exist.php";

    var xhttp;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) {
            if(this.responseText.lastIndexOf("ERR", 0) === 0) {
                errorCallback(this.responseText);
            } else {
                successCallback(this.responseText);
            }
        }
    };
    xhttp.open("GET", url + '?trackingCode=' + trackingCode, true);
    xhttp.send();
}


function getXLSXFile(filename, successCallback, errorCallback) {
    var url = OLDFILEDIRECTORY + filename;

    var oReq;
    if(window.XMLHttpRequest) {
        oReq = new XMLHttpRequest();
    } else if(window.ActiveXObject) {
        oReq = new ActiveXObject('MSXML2.XMLHTTP.3.0');
    } else {
        throw "XHR unavailable for your browser";
    }

    //document.getElementById('fileurl').innerHTML = '<a href="' + url + '">Download file</a>';  //TODO: add link to download original?

    oReq.open("GET", url, true);

    if(typeof Uint8Array !== 'undefined') {
        oReq.responseType = "arraybuffer";
        oReq.onload = function(e) {
            //if(typeof console !== 'undefined') console.log("getXLSX onload(" + filename + ")", new Date());
            var arraybuffer = oReq.response;
            var data = new Uint8Array(arraybuffer);
            var arr = new Array();
            for(var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
            var wb = XLSX.read(arr.join(""), {
                type: "binary"
            });
            updateStatus(filename + " read from server successfully.");
            fileWasReadAsWorkbookCallback(wb);
        };
    } else {
        oReq.setRequestHeader("Accept-Charset", "x-user-defined");
        oReq.onreadystatechange = function() {
            if(oReq.readyState == 4 && oReq.status == 200) {
                var ff = convertResponseBodyToText(oReq.responseBody);
                if(typeof console !== 'undefined') console.log("onload", new Date());
                var wb = XLSX.read(ff, {
                    type: "binary"
                });
                updateStatus(filename +
                    " read from server successfully. (This is not an error, however, if you see this message, please let jfederer@usgs.gov know with the following message code: JOE_001)"
                );
                fileWasReadAsWorkbookCallback(wb);
            }
        };
    }

    oReq.send();
}


///////////////////////
////// CALLBACKS //////
///////////////////////
function matchingFileFoundCallback(filename) {
    var msg = "The filename matching tracking code is: " + filename;
    updateStatus(msg);
    getXLSXFile(filename, updateStatus, alertCallback);
}

function fileWasReadAsWorkbookCallback(wb) {
    oldWS = getFirstSheet(wb);
    //updateStatus(X.utils.sheet_to_csv(oldWS));
    sheetsLoaded(); //newWB is a global -- 'wb' is the old version of the file pulled off the server
}

function alertCallback(msg) {
    alert(msg);
}

function fileTrackingErrorCallback(errMsg) {
    console.error("File Tracking Error: " + errMsg);
    alert("There was an error with the file tracking process: \n" + errMsg)
}


////////////////////////
////// XLSX tools //////
////////////////////////
function compareFilesByColumns(Ws_new, Ws_old) {
    // given a new and old worksheet, will return an list (as an array) of headers of any new columns.

    newjson = X.utils.sheet_to_json(Ws_new, {
        "defval": ""
    });
    oldjson = X.utils.sheet_to_json(Ws_old, {
        "defval": ""
    });

    var retArr = [];
    
    Object.keys(newjson[0]).forEach(function(key) {
        if(!oldjson[0].hasOwnProperty(key)) {
            retArr.push(key);
        }
    });

    return retArr;
}

function compareFilesByLine(Ws_new, Ws_old) {
    // looks through two worksheets and returns an array of json objects (rows) from the Ws_new that are different from Ws_old
    // as well as a new key ("VALUES_CHANGED") with an array of the headers of the values that changed.
    newjson = X.utils.sheet_to_json(Ws_new, {
        "defval": ""
    });
    oldjson = X.utils.sheet_to_json(Ws_old, {
        "defval": ""
    });
    retjson = [];
    for(let row in newjson) {
        if(newjson.hasOwnProperty(row) && oldjson.hasOwnProperty(row)) { // if the row exists for both
            // go through each element in row and find which ones are different, using headers from the OLD json s oas to avoid any new columns entirely
            values_changed = [];
            for(let header in oldjson[row]) {
                if(newjson[row].hasOwnProperty(header) && oldjson[row].hasOwnProperty(header) &&
                    newjson[row][header] !== oldjson[row][header]) {
                    values_changed.push(header);
                }
            }
            if(values_changed.length > 0) {
                newjson[row]["VALUES_CHANGED"] = values_changed;
                retjson.push(newjson[row]);
            }
        }
    }
    return retjson;
}

function getFirstSheet(wb) {
    return wb.Sheets[wb.SheetNames[0]];
}

function wb_to_json(workbook) {
    var result = {};
    workbook.SheetNames.forEach(function(sheetName) {
        var roa = X.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
        if(roa.length > 0) {
            result[sheetName] = roa;
        }
    });
    return result;
}

function wb_to_csv(workbook) {
    var result = [];
    workbook.SheetNames.forEach(function(sheetName) {
        var csv = X.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        if(csv.length > 0) {
            result.push("SHEET: " + sheetName);
            result.push("");
            result.push(csv);
        }
    });
    return result.join("\n");
}

function wb_to_formulae(workbook) {
    var result = [];
    workbook.SheetNames.forEach(function(sheetName) {
        var formulae = X.utils.get_formulae(workbook.Sheets[sheetName]);
        if(formulae.length > 0) {
            result.push("SHEET: " + sheetName);
            result.push("");
            result.push(formulae.join("\n"));
        }
    });
    return result.join("\n");
}
