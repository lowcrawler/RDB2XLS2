
function findMatchingCodeInQWsample(needle) {
    console.log(needle);
    var found = new Array();
    var matchedQWSRowNum = 0;
    for(var j = 0; j < qwsample.length; j++) {

        let QWSRowCode = qwsample[j][QWS_AGNCY_COL] + qwsample[j][QWS_STAID_COL] + qwsample[j][QWS_DATETIME_COL] + qwsample[j][QWS_EDATETIME_COL] +
            qwsample[j][QWS_MEDIM_COL];
        console.log("QWS Row Code #" + j + " = " + QWSRowCode);
        if(isNaN(QWSRowCode)) {
            continue;
        }
        if(QWSRowCode === needle) {
            found.push(qwsample[j][0]);
            matchedRowNum = j;
        }
    }
    if(found.length == 0) {
        updateStatus("ERR: No matching unqiue ID found for sample. [" + needle + "]");
        return; //exiting
    }
    if(found.length > 1) {
        updateStatus("ERR: Multiple matching unqiue ID found for sample. [" + needle + "]");
        return; //exiting
    }
    return new Array(found[0], matchedRowNum);
}

function findMatchingCodeInQWsample_ID(needle) {
    try {
        return findMatchingCodeInQWsample(needle)[0];
    } catch(err) {
        updateStatus("ERR: Unable to retrieve unique ID in qwsample for unqiue ID derived from updated rows . [" + needle + "]");
        console.err(err);
        return;
    }

}

function findMatchingCodeInQWsample_RowNum(needle) {
    try {
        return findMatchingCodeInQWsample(needle)[1];
    } catch(err) {
        updateStatus("ERR: Unable to retrieve row number in qwsample for unqiue ID. [" + needle + "]");
        console.err(err);
        return;
    }

}


function createOutputObjects() {
    var qwresult2d = new Array(); //two dimensional array that will be converted to tab delimited file QWresult

    for(var i = 0; i < updatedRows.length; i++) {
        var uniqueCodeFromUpdatedRows = updatedRows[i]["AGNCY"] + updatedRows[i]["STAID"] +
            updatedRows[i]["DATES"] + updatedRows[i]["TIMES"] + updatedRows[i]["EDATE"] + updatedRows[i]["ETIME"] + updatedRows[i]["MEDIM"]; //this is defined by nwis as the elements that make a unique entry

        console.log("updated date: " + updatedRows[i]["EDATE"]);
        console.log("updated time: " + updatedRows[i]["ETIME"]);

        for(var vcNum = 0; vcNum < updatedRows[i]["VALUES_CHANGED"].length; vcNum++) { // go through every changed value
            let changedFieldName = updatedRows[i]["VALUES_CHANGED"][vcNum];
            //check if this is an update to qwsample or a new line in qwresultRow
            if(EDITABLE_QWSAMPLE_FIELDS.includes(changedFieldName)) {
                // this is an edit to QWSAMPLE
                try {
                    var rowNumToEdit = findMatchingCodeInQWsample_RowNum(uniqueCodeFromUpdatedRows);
                    var colNumToEdit = QWSAMPLE_FIELD_NUMBERS[changedFieldName];
                    qwsample[rowNumToEdit][colNumToEdit] = updatedRows[i][changedFieldName];
                } catch(err) {
                    updateStatus("ERR: Unable to update qwsample for unqiue ID [" + uniqueCodeFromUpdatedRows + "] and field name [" +
                        changedFieldName + "]");
                    console.error(err);
                }


            } else if(EDITABLE_PCODE_FIELDS.includes(changedFieldName)) {
                // this is to be a new line in QWRESULT
                var qwresultRow = new Array();

                //first column ([0]): match ID in first column of qwsample file  (derive match from from col 2[in qwsample] (AGNCY [in xlsx]), 3 (STAID), 4 (DATES+TIMES), & 6 (MEDIM) ) ...  (kind of '6' but there are two tabs between )
                qwresultRow[QWR_ROWID_COL] = findMatchingCodeInQWsample_ID(uniqueCodeFromUpdatedRows);

                //second ([1]) column: pcode (header) sans the 'P' from xlsx file
                var pCodeYes = false;
                qwresultRow[QWR_PCODE_COL] = changedFieldName;
                if(/P\d{4}/.test(qwresultRow[QWR_PCODE_COL])) {
                    qwresultRow[QWR_PCODE_COL] = qwresultRow[QWR_PCODE_COL].replace('P', ''); //note, replace only replaces first intance when given string (vs all when given regex)
                }

                //third ([2]) column: new/updated values
                //fourth ([3]) column: any remark code (< or > or M or E ... always in first spot ... throw error on anything else)
                var newValue = updatedRows[i][changedFieldName];
                var remarkCode = "";
                if(newValue.charAt(0) === "<" || newValue.charAt(0) === ">" || newValue.charAt(0) === "M" || newValue.charAt(0) === "E") {
                    remarkCode = newValue.charAt(0);
                    newValue = newValue.substring(1);
                } else {
                    if(newValue.charAt(0) !== "-" && !newValue.match(/^-?\d+\.?\d*$/) && newValue.trim() !== "") {
                        updateStatus("ERR: Invalid value for " + changedFieldName + " found in changed xlsx: [" + newValue +
                            "]");
                        //         // return; //exiting
                        //         //TODO: verify with tim what to do if 'blank' is found.
                        // TODO: Just fine, not an error.
                    }
                }
                qwresultRow[QWR_VALUE_COL] = newValue;
                qwresultRow[QWR_REMARK_COL] = remarkCode;
                qwresult2d.push(qwresultRow);
            } else {
                updateStatus("ERR: Attempted edit on invalid field: [" + changedFieldName + "]");
                return; //exiting
                //TODO: verify with tim what to do if someone tries to edit an un-editable field.
            }

        } // end for(VALUES_CHANGED)
    } // end for(updatedRows)

    updateStatus("QWRESULT generation complete, downloading file.");
    saveFile(getStringFrom2dArray(qwresult2d), "qwresult");
    updateStatus("QWSAMPLE editing complete, downloading file.");
    saveFile(getStringFrom2dArray(qwsample), "qwsample");
}