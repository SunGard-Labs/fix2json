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
var dictname;	
var filename;
var tags = {};
var rd = {};

checkParams();

try {
	tags = readDataDictionary(dictname);
} catch(dictionaryException) {
	console.error("Could not read dictionary file " + dictname + ", error: " + dictionaryException);
	process.exit(1);
}

var input = filename ? fs.createReadStream(filename) : process.stdin;

rd = readline.createInterface({
	input: input,
	output: process.stdout,
	terminal: false
});

rd.on('line', function(line) {
	console.log(decoder.write(processLine(line)));
});

function processLine(line) {
	var msg = extractFields(line);
	var keys = Object.keys(msg);
	var record = {};	
	_.each(keys, function(key, keyIndex, keyList) { 
		if (key.length > 0) {
			var tag = tags[key] ? tags[key].name : key;
			var val = msg[key];
			record[tag] = mnemonify(key, val);
   		}
	});		
        return pretty ? JSON.stringify(record, undefined, 4) : JSON.stringify(record);
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

function checkParams() {

    if (process.argv.length < 3) {
	console.error("Usage: fix2json [-p] <data dictionary xml file> [path to FIX message file]");
	console.error("\nfix2json will use standard input in the absence of a message file.");
	process.exit(1);
    } else if (process.argv.length === 3) {
	dictname = process.argv[2];
    } else if (process.argv.length === 4) {
	if (process.argv[2] === '-p') {
	    pretty = true;
	    dictname = process.argv[3];
	} else {
	    dictname = process.argv[2];
	    filename = process.argv[3];
	}
    } else if (process.argv.length === 5) {
	pretty = true;
	dictname = process.argv[3];
	filename = process.argv[4];
    }

}
