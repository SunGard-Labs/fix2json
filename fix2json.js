#! /usr/bin/env node

var fs = require('fs')
var _ = require('underscore');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var readline = require('readline');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder();
var delim = String.fromCharCode(01); // ASCII start-of-header
var pretty = false;

if (!process.argv[3]) {

	console.error("Usage: fix2json [-p] <data dictionary xml file> <FIX message file>");
	process.exit(1);

} else {
	var dictname;	
       	var filename;
	var output;

	if (process.argv[2] === '-p') {
		pretty = true;
		dictname = process.argv[3];
		filename = process.argv[4];
	} else {
		dictname = process.argv[2];    
    		filename = process.argv[3];	
	}

	var tags = {};

	try {
		tags = readDataDictionary(dictname);
	} catch(dictionaryException) {
		console.error("Could not read dictionary file " + dictname + ", error: " + dictionaryException);
		process.exit(1);
	}

	var rd = readline.createInterface({
		input: fs.createReadStream(filename),
		output: process.stdout,
		terminal: false
	});

	rd.on('line', function(line) {
		var msg = extractFields(line);
		var keys = Object.keys(msg);
		var record = {};	
		_.each(keys, function(key, keyIndex, keyList) { 
			var tag = tags[key] ? tags[key].name : key;
			if (key.length > 0) {
				var val = msg[key];
				record[tag] = mnemonify(key, val);
	   		}
		});
		
		output = pretty ? JSON.stringify(record, undefined, 4) : JSON.stringify(record);

		console.log(decoder.write(output));
	});

}

function extractFields(record) {

    var field = {};

    var fields = record.split(delim);

    for (var i = 0; i < fields.length; i++) {
        var both = fields[i].split('=');
        field[both[0].replace("\n", '').replace("\r", '')] = both[1];
    }

    return field;

}

function mnemonify(tag, val) {
	return tags[tag] ? (tags[tag].values ? (tags[tag].values[val] ? tags[tag].values[val] : val) : val) : val;
}

function readDataDictionary(fileLocation) {

	var xml = fs.readFileSync(fileLocation).toString();
	var dom = new DOMParser().parseFromString(xml);
	var nodes = xpath.select("//fix/fields/field", dom);
	var dictionary = {};
	
	for (var i = 0; i < nodes.length; i++) {

		var tagNumber = nodes[i].attributes[0].value
		var tagName = nodes[i].attributes[1].value;
	
		var valElem = nodes[i].getElementsByTagName('value');
		var values = {};
	
		for (var j = 0; j < valElem.length; j++) {
			values[valElem[j].attributes[0].value] = valElem[j].attributes[1].value.replace(/_/g, ' ');
		}

		dictionary[tagNumber] = {
			name: tagName,
			values: values
		};

	}
	
	return dictionary;

}


