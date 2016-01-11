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
var NUMERIC_TYPES=['FLOAT', 'AMT', 'PRICE', 'QTY', 'INT', 'SEQNUM']


checkParams();
var dom = readDataDictionary(dictname);
var tags = buildTagTypeMap(dom);
// console.log(tags);
var msgMap = buildMessageFieldMap(dom);
//console.log(msgMap);


try {
    var input = filename ? fs.createReadStream(filename) : process.stdin;
    rd = readline.createInterface({
	    input: input,
	    output: process.stdout,
	    terminal: false
    });
    rd.on('line', function(line) {
	    if (line.indexOf(delim) > -1) {
		processMessage(line);
	    }
    });
} catch(mainException) {
    console.error("Error in main routine: " + mainException);
    process.exit(1);
}

function processMessage(msg) {
    console.log(extractFields(msg));
    console.log("\n");
}

// //fix/fields/field[@number='35']
// //fix/messages/message[@msgtype='d']
// //fix/components/component[@name='PositionAmountData']
// //fix/components/component/group[@name='NoPosAmt']/field/@name
// ALL GROUPS: //fix/fields/field[@type='NUMINGROUP']/@name
// //fix/components/component[@name='PositionAmountData']/group/field/@name
// //fix/components/component/field[@name='SecurityXML']/@required

function extractFields(record) {
    var fieldArray = [];
    var fields = record.split(delim);
    for (var i = 0; i < fields.length; i++) {
    	var both = fields[i].split('=');
	both[0].replace("\n", '').replace("\r", '');
	if (both[0]) {
	    var xpth = '//fix/fields/field[@number=\'' + both[0] + '\']/@type'; // replace
	    var fieldDefs = xpath.select(xpth, dom); // replace
	    var tag = both[0];
	    var val = both[1]; // format this depending on type
	    fieldArray.push({ 
		tag: tag, 
		val: val,
		type: fieldDefs[0].nodeValue
	    });
	}
    }
    return fieldArray;
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
	var components = msgDefs[i].getElementsByTagName('components');
	var msgFields = [];

	for (var j = 0; j < fields.length; j++) {
	    msgFields.push(fields[j].attributes[0].value);
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

