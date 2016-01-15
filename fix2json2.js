#! /usr/bin/env node

// modules

var fs = require('fs');
var util = require('util');
var xpath = require('xpath');
var _ = require('underscore');
var DOMParser = require('xmldom').DOMParser;
var readline = require('readline');
var StringDecoder = require('string_decoder').StringDecoder;
var YAML = require('yamljs');
var decoder = new StringDecoder();

// locals

var delim = String.fromCharCode(01); // ASCII start-of-header
var pretty = false;
var dictname;	
var filename;
var GROUPS = {};
var FIX_VER = undefined;
var rd = {};
var yaml = false;

// constants & literals

var NUMERIC_TYPES=['FLOAT', 'AMT', 'PRICE', 'QTY', 'INT', 'SEQNUM', 'NUMINGROUP', 'LENGTH', 'PRICEOFFSET'];

var FIX50SP2='5.0.2';
var FIX50SP1='5.0.1';
var FIX50='5.0.0';
var FIX42='4.2.0';
var FIX44='4.4.0';

// TODO:
// refactor all dictionary operations into strategies indexed by data dictionary version

checkParams();

try {

    var input = filename ? fs.createReadStream(filename) : process.stdin;
	var dom = readDataDictionary(dictname);
	var tags = buildTagTypeMap(dom);
	var msgMap = buildMessageFieldMap(dom);

	console.log(JSON.stringify(tags, undefined, 1));

	//util.inspect(tags);

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

	var fieldArray = extractFields(msg, tags, msgMap);

	// create object to store the return object

	for (var i = 0; i < fieldArray.length; i++) {
		
		// for each field
		//  - mnemonify values
		// - check to see if current field type is NUMINGROUP
		// 	if so, pluck groups in tags recursively
		// - othereise, 
		// 	add the tagname and mnemonified value to the returnable object
		//			

	}

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
			json[name] = value;

			if (type === 'NUMINGROUP') {
				// 	
			}

			fieldArray.push({ 
								name: name,
								value: value
							}
			);

		}
	}
	return fieldArray;
}

function castFixType(value, fixType) {
	return _.contains(NUMERIC_TYPES, fixType) ? Number(value) : value;
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

function mnemonify(tag, val) {
	return TAGS[tag] ? (TAGS[tag].values ? (TAGS[tag].values[val] ? TAGS[tag].values[val] : val) : val) : val;
}

function pluckGroup(fieldArray, groupName) {

	var group = [];
	var member = {};			
	var firstProp = undefined;
	var idx = 0;

	while (fieldArray.length > 0) {
		var tag = fieldArray.shift();
		var key = tag.tag;
		var val = tag.value;				
		if (idx === 0) {
			firstProp = key;
			member[key] = val;
		} else if (_.contains(Object.keys(GROUPS), key)) {
			member[key] = val;
			var newGroup = pluckGroup(tagArray, key);
		 	member[key.substring('No'.length)] = newGroup;
		} else if (key === firstProp && idx > 0) {
			group.push(member);
			member = {};
			member[key] = val;
		} else if (!_.contains(GROUPS[groupName], key)) {
			tagArray.push(tag)
			group.push(member);
 			return group;
		} else {
			member[key] = val;
		}
		idx++;
	}

}

function buildTagTypeMap(dom) {
    var tags = {};
    var xpth = '//fix/fields/field';
    var fieldDefs = xpath.select(xpth, dom);
    for (var i = 0; i < fieldDefs.length; i++) {
		var number = fieldDefs[i].attributes[0].nodeValue;
		var name = fieldDefs[i].attributes[1].nodeValue;
		var type = fieldDefs[i].attributes[2].nodeValue;

		var values = [];
		var list = fieldDefs[i].getElementsByTagName('value');
		if (list) {
			for (var j = 0; j < list.length; j++) {
				values.push({
					value: list[j].attributes[0].value,
					description: list[j].attributes[1].value
				});
			}			
		}

		tags[number] = { 
	    	name: name, 
	    	type: type,
			values: values
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

//		console.log(components)

		for (j = 0; j < components.length; j++) {

			var component = components[j].attributes[0].value;

//			console.log(component);

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

