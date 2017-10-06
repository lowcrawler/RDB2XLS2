function process_wb(wb) {  //Insertion point into business logic after file uploaded
    // sets global newWS, finds tracking code and checks for old file.
    updateStatus("Ingesting workbook complete.");
    //TODO: If XLSXREADY == TRUE... mgiht want to throw error for uploading addtional xlsx... however, might want to allow batching as well... so
    updateStatus("Processing new workbook.");

    newWS = getFirstSheet(wb); //newWs is global
    var trackingCode = getTrackingCode(newWS);
    updateStatus("Tracking code (" + trackingCode + ") found.");

    // this is the jump off point to the cascading function processing that runs through,
    // fills global 'oldWS', and eventually runs "sheetsLoaded" if successful
    // TODO-- for maintainability, shold convert to promises...
    checkIfFileExists(trackingCode, matchingFileFoundCallback, fileTrackingErrorCallback);
}

function sheetsLoaded() {
    // Checks for differences in the sheets and updates UI with results
    // This should be called after global variables newWS and oldWS have been loaded.
    updateStatus("Both new and old sheets sucessfully loaded.");

    updatedRows = compareFilesByLine(newWS, oldWS);  //an array of json objects (rows) from the Ws_new with values that are different from Ws_old
    if(updatedRows === undefined || updatedRows.length == 0) {
        alert("No differences found in the files... exiting.");
        return;
    }
    updateStatus("It appears " + updatedRows.length + " lines were updated; displaying and highlighting below.");
    displayChangesTable();

    newColHeaders = compareFilesByColumns(newWS, oldWS);  // an array of headers found in newWS that were not in oldWS
    if(newColHeaders.length >  0 ) {
        updateStatus("It appears " + newColHeaders.length + " columns were added: (" + newColHeaders+")");
    }

    document.getElementById("xlsxfilecheckbox").checked = true;
    xlsxReady = true; //global
    checkIfPhase2Ready();
}

function process_qwsampleFile(qws) { //qws is tab-delimited text data
    updateStatus("Ingesting qwsample complete.");

    qwsLines = qws.split("\n");
    qwsample = new Array();
    for(let i = 0; i < qwsLines.length; i++) {
        qwsample.push(qwsLines[i].split("\t"));
    }
    document.getElementById("qwsamplefilecheckbox").checked = true;
    qwsampleReady = true;
    updateStatus("Processing qwsample file complete.");
    checkIfPhase2Ready();
}

function checkIfPhase2Ready() {
    // Checks if we are ready to proceed with generating output
    if(xlsxReady && qwsampleReady) {
        updateStatus("Ready to complete phase 2");
        document.getElementById("checkarea").classList.add("hidden");
        createOutputObjects();
    }
}


///////////////////
///  UI Update  ///
///////////////////
function displayChangesTable() {
    //IMPROVE: 
    // display the changes to the user as a table
    var myTableDiv = document.getElementById("updated")
    var table = document.createElement('TABLE')
    var tableBody = document.createElement('TBODY')

    table.border = '0';
    table.appendChild(tableBody);

    var headers = new Array();
    for(let header in updatedRows[0]) {
        if(header.toString() != "VALUES_CHANGED" && header.toString() !== "Tracking Code for this worksheet from RDB2XLS, do not modify") {
            headers.push(header);
        }
    }

    var rows = new Array();
    for(i = 0; i < updatedRows.length; i++) {
        var row = updatedRows[i];
        var tempArr = new Array();
        for(j = 0; j < headers.length; j++) {
            tempArr.push(row[headers[j]]);
        }
        rows.push(tempArr);
    }

    var tr = document.createElement('TR');
    tableBody.appendChild(tr);
    for(i = 0; i < headers.length; i++) {
        var th = document.createElement('TH')
        th.width = '75';
        th.appendChild(document.createTextNode(headers[i]));
        tr.appendChild(th);

    }

    for(i = 0; i < rows.length; i++) {
        var tr = document.createElement('TR');
        for(j = 0; j < rows[i].length; j++) {

            var td = document.createElement('TD')
            var node = document.createTextNode(rows[i][j]);

            td.appendChild(node);

            if(updatedRows[i]["VALUES_CHANGED"].indexOf(headers[j]) >= 0) {
                //TODO: -- put in tooltip or alternative of original info
                td.setAttribute("style", "background-color:#f99;")
            }
            tr.appendChild(td)
        }
        tableBody.appendChild(tr);
    }

    updatedValuesTable.appendChild(table);
    updatedValuesTable.parentElement.classList.remove('hidden');
}


