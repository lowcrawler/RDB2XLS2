var XW = {
	/* worker message */
	msg: 'xlsx',
	/* worker scripts */
	rABS: './xlsxworker2.js'
};



function arayBuffer2String(data) {
	var o = "",
		l = 0,
		w = 10240;
	for(; l < data.byteLength / w; ++l) o += String.fromCharCode.apply(null,
		new Uint16Array(
			data.slice(l * w, l * w + w)));
	o += String.fromCharCode.apply(null, new Uint16Array(data.slice(l * w)));
	return o;
}

function string2ArrayBuffer(s) {
	var b = new ArrayBuffer(s.length * 2),
		v = new Uint16Array(b);
	for(var i = 0; i != s.length; ++i) v[i] = s.charCodeAt(i);
	return [v, b];
}


function xw_xfer(data, cb) {
	var worker = new Worker(XW.rABS);
	worker.onmessage = function(e) {
		switch(e.data.t) {
			case 'ready':
				break;
			case 'e':
				console.error(e.data.d);
				break;
			default:
				xx = arayBuffer2String(e.data).replace(/\n/g, "\\n").replace(/\r/g,
					"\\r");
				cb(JSON.parse(xx));
				break;
		}
	};

	var val = string2ArrayBuffer(data);
	worker.postMessage(val[1], [val[1]]);
}



function uploadFiles(files) {
	if(files.length > 1) {
		updateStatus("Multiple files uploaded, attempting concurrent processing.");
		//TODO: split status message area, add optional parameter to update status on each file.
	}
	if(files.length > 2) {
		alert("You have dropped more than 2 files at a time. This is likely an error on your part (please double-check).\n\n" +
			" Processing will be attempted anyway.");
	}
	for(var i = 0; i < files.length; i++) {
		if(files[i].name.split('.').pop().toUpperCase() === "XLSX" || files[i]
			.name.split(
				'.').pop().toUpperCase() === "QWSAMPLE") {
			document.getElementById("phase2").classList.remove("hidden");
		}
		setupReader(files[i]);
	}
}

function setupReader(file) {
	var reader = new FileReader();
	var name = file.name;
	updateStatus("Uploading " + name);

	reader.onload = function(e) {
		updateStatus("Uploading complete for " + name);
		var data = e.target.result;
		var filetype = file.name.split('.').pop().toUpperCase();
		switch(filetype) {
			case "XLSX":
				xw_xfer(data, process_wb);
				break;
			case "QWSAMPLE":
				process_qwsampleFile(data);
				break;
			default:
				updateStatus("ERR: " + name + "File format didn't match known formats... not processing."); //TODO: try something anyway?  dialog to pick one?
				return;
		}


	};
	reader.readAsBinaryString(file);
}

function saveFile(txt, filename) {
	var blob = new Blob([txt], {
		type: "text/plain;charset=utf-8"
	});
	saveAs(blob, filename);
}

function handleDragover(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	document.getElementById('drop').classList.add('over');
}

function handleDragLeave(e) {
	e.stopPropagation();
	e.preventDefault();
	//e.dataTransfer.dropEffect = 'copy';
	document.getElementById('drop').classList.remove('over');

}

function handleDrop(e) { // this handles if they drop a file
	e.stopPropagation();
	e.preventDefault();
	var files = e.dataTransfer.files;
	document.getElementById('drop').classList.add('fadeOut');
	document.getElementById('drop').classList.remove('over');
	uploadFiles(files)
}

function handleFile(e) { // this handles is they select a file TODO: file handling can probably be combined
	var files = e.target.files;
	uploadFiles(files);
	// var f = files[0];
	// var reader = new FileReader();
	// var name = f.name;
	// reader.onload = function(e) {
	// 	if(typeof console !== 'undefined') console.log("handle file ("+name+") onload ", new Date());
	// 	var data = e.target.result;
	// 	xw_xfer(data, process_wb);
	// };
	// reader.readAsBinaryString(f);
}
