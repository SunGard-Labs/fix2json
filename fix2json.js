#! /usr/bin/env node

var fs = require('fs');
var _ = require('underscore');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;
var delim = String.fromCharCode(01); // ^A, accept alternatives from command line ("|")?

if (!process.argv[3]) {

	console.error("Usage: fix2json <data dictionary xml file> <FIX message file>");
	process.exit(1);

} else {

    var dictname = process.argv[2];    
    var filename = process.argv[3];	

    if (fs.existsSync(filename)) {
	
	var tags = {};
	var rawFix = "";
	var toJson = [];

	try {
		tags = readDataDictionary(dictname);
	} catch(dictionaryException) {
		console.error("Could not read dictionary file " + dictname + ", error: " + dictionaryException);
		process.exit(1);
	}

	try {
		 rawFix = fs.readFileSync(filename);
	} catch (messageException) {
		console.error("Could not read " + filename + ", error: " + messageException);
		process.exit(1);
	}	

	var parsed = parseMessages(rawFix.toString());

	_.each(parsed, function (element, index, list) {
	    var record = {};
	    var keys = Object.keys(element);
	    _.each(keys, function(key, keyIndex, keyList) { 
		var tag = tags[key] ? tags[key].name : key;
		if (key.length > 0) {
		    var val = element[key];
		    record[tag] = mnemonify(key, val);
	   	    toJson.push(record);
		}
	    });
	});

	console.log(JSON.stringify(toJson, undefined, 4));
	process.exit(0);

    } else {

	console.error("Could not open input file " + filename + " for reading, file not found.");
	process.exit(1);

    }
}

function parseMessages(fixData) {

	if (fixData.length === 0) {
		console.error("Input to parseMessages was empty!");
		return undefined;
	}		
	
	//messages = fixData.match(/[^0-9a-zA-Z:\s]*(.*?)[^0-9]10=\d\d\d.?/g);
	var messages = fixData.split("\n");

	if (messages === null) {
		console.error("No messages found in file!");
		return undefined;
	}	

	var output = new Array(messages.length);
	
	for (var i = 0; i < messages.length; i++) {
		output[i] = extractFields(messages[i], delim);
	}	

	return output;
}

function extractFields(record, delim) {

    var field = {};

    var fields = record.split(delim);

    for (var i = 0; i < fields.length; i++) {
        var both = fields[i].split('=');
        field[both[0]] = both[1];
    }

    return field;

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

function mnemonify(tag, val) {
	return tags[tag] ? (tags[tag].values ? (tags[tag].values[val] ? tags[tag].values[val] : val) : val) : val;
}
