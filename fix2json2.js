#! /usr/bin/env node

var fs = require('fs');
var xpath = require('xpath');
var _ = require('underscore');
var DOMParser = require('xmldom').DOMParser;
var readline = require('readline');
var StringDecoder = require('string_decoder').StringDecoder;
var YAML = require('yamljs');
var decoder = new StringDecoder();
var delim = String.fromCharCode(01); // ASCII start-of-header
var pretty = false;
var dictname;	
var filename;
var GROUPS = {};
var FIX_VER = undefined;
var rd = {};
var yaml = false;
var NUMERIC_TYPES=['FLOAT', 'AMT', 'PRICE', 'QTY', 'INT', 'SEQNUM', 'NUMINGROUP', 'LENGTH', 'PRICEOFFSET'];

checkParams();

try {

    var input = filename ? fs.createReadStream(filename) : process.stdin;
	var dom = readDataDictionary(dictname);
	var tags = buildTagTypeMap(dom);
	var msgMap = buildMessageFieldMap(dom);

    rd = readline.createInterface({
	    input: input,
	    output: process.stdout,
	    terminal: false
    });
    rd.on('line', function(line) {
	    if (line.indexOf(delim) > -1) {
			processMessage(line, tags, msgMap);
	    }
    });
} catch(mainException) {
    console.error("Error in main routine: " + mainException);
    process.exit(1);
}

function processMessage(msg, tags, msgMap) {
    console.log(JSON.stringify(extractFields(msg, tags, msgMap), undefined, 1));
    console.log("\n");
}

// //fix/fields/field[@number='35']
// //fix/messages/message[@msgtype='d']
// //fix/components/component[@name='PositionAmountData']
// //fix/components/component/group[@name='NoPosAmt']/field/@name
// ALL GROUPS: //fix/fields/field[@type='NUMINGROUP']/@name
// //fix/components/component[@name='PositionAmountData']/group/field/@name
// //fix/components/component/field[@name='SecurityXML']/@required

function extractFields(record, tags, msgMap) {
    var fieldArray = [];
    var fields = record.split(delim);
	var json = {};

    for (var i = 0; i < fields.length; i++) {
    	var both = fields[i].split('=');
		both[0].replace("\n", '').replace("\r", '');
		if (both[0]) {
	   		var tag = both[0];
	    	var val = both[1]; 
			var type; 
			var name;
			
			if (tags[tag]) {
				type = tags[tag].type ? tags[tag].type : undefined;
				name = tags[tag].name ? tags[tag].name : undefined;
			}
			 
			var value = castFixType(val, type);

			fieldArray.push({ 
							name: name,
							value: value
			});
			json[name] = value;
		}
	}
	return fieldArray;
}

function castFixType(value, fixType) {
	if (_.contains(NUMERIC_TYPES, fixType)) {
		console.log(value + " should be a number: " + value + " (" +  fixType + ")") ;
		return Number(value);
	} else {	
		console.log(value + " not in numerics " + " (" +  fixType + ")");
		return value;
	}
}

function resolveFields(fieldArray) {
    var targetObj = {};
    while (fieldArray.length > 0) {
		var field = fieldArray.shift();
		var xpth = '//fix/messages/message[@name=\'' + '' + '\']/field'; // replace
		var fields = xpath.select(xpth, dom); // replace
		targetObj[field.tag] = field.val;
    }		     
    return targetObj;
}
    
function readDataDictionary(fileLocation) {
    var xml = fs.readFileSync(fileLocation).toString();
    return new DOMParser().parseFromString(xml);
}

function buildTagTypeMap(dom) {
    var tags = {};
    var xpth = '//fix/fields/field';
    var fieldDefs = xpath.select(xpth, dom);
    for (var i = 0; i < fieldDefs.length; i++) {
	var number = fieldDefs[i].attributes[0].nodeValue;
	var name = fieldDefs[i].attributes[1].nodeValue;
	var type = fieldDefs[i].attributes[2].nodeValue;
	tags[number] = { 
	    name: name, 
	    type: type
	};
    }
    return tags;
}

function buildMessageFieldMap(dom) {
    var messages = {};

    var xpth = '//fix/messages/message';
    var msgDefs = xpath.select(xpth, dom);

    for (var i = 0; i < msgDefs.length; i++) {

		var msgName = msgDefs[i].attributes[0].value; // message name
		var fields = msgDefs[i].getElementsByTagName('field');
		var components = msgDefs[i].getElementsByTagName('component');
		var msgFields = [];

		for (var j = 0; j < fields.length; j++) {
		    msgFields.push(fields[j].attributes[0].value);
		}
		for (j = 0; j < components.length; j++) {
			//console.log(components[j].attributes[0].value + " / " + components[j].attributes[1].value);
			//var subFields = components[j].getElementsByTagName('group');
//			console.log('\t' + subFields.length + " subfields");	
		}
		messages[msgName] = msgFields;
	 }
	return messages;
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

