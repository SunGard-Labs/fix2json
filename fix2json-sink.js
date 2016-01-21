#! /usr/bin/env node

var fs = require('fs');
var xml2json = require('xml2json');
var util = require('util');
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
var TAGS = {};
var GROUPS = {};
var FIX_VER = undefined;
var rd = {};
var yaml = false;
var dictionary;

var NUMERIC_TYPES=['FLOAT', 'AMT', 'PRICE', 'QTY', 'INT', 'SEQNUM', 'NUMINGROUP', 'LENGTH', 'PRICEOFFSET'];

// some of these TODO's below are very speculative:
//
// TODO: decouple logic from file ingestion, but if this was a browser module, how would we package the dictionaries?
// TODO: get dictionary management out of this module
// TODO: XML merge for customizing data dictionaries with fragments
// TODO: ability to hold multiple dictionaries in memory
// TODO: autodetect FIX version from source data?
// TODO: option to flatten groups?
// TODO: emit pre and post processing events for each message processed
// TODO: forward engineer JSON to FIX?  Would be pretty useful for browser UI's based on FIX dictionaries

checkParams();

try {

	readDataDictionary(dictname);

	var msgs = dictionary.fix.messages.message;
	for (var i = 0; i < msgs.length; i++) {
		var comp = msgs[i].component;
		if (comp && comp.group > 0) {
			for (var j = 0; j < comp.group.length; j++) {
				//console.log(JSON.stringify(groupFields(comp.group[i].name), undefined, 1));			
			}	
		} else {
//			console.log(JSON.stringify(comp, undefined, 1));
		}
	}

//	process.exit(0);
	

	var input = filename ? fs.createReadStream(filename) : process.stdin;

	rd = readline.createInterface({
		input: input,
		output: process.stdout,
		terminal: false
	});

	rd.on('line', function(line) {
		if (line.indexOf(delim) > -1) {
		    console.log(decoder.write(processLine(line)));
		}
	});

} catch(mainException) {
	console.error("Error in main routine: " + mainException);
	process.exit(1);
}
	
function pluckGroup(tagArray, groupName) {
	var group = [];
	var member = {};			
	var firstProp = undefined;
	var idx = 0;

	while (tagArray.length > 0) {

		var tag = tagArray.shift();
		var key = tag.tag;
		var val = tag.val;				
		if (idx === 0) {
			firstProp = key;
			member[key] = val;
		} else if (_.contains(getAllGroupNames(), key)) {
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

function flattenComponent(componentName) {

	var component = _.findWhere(dictionary.fix.components.component, { name: componentName });

	if (!component) {
		console.error('could not flatten ' + componentName);
		return [];
	}
	
	var fields = [];	
	if (component.component && component.component.length > 0) {
		for (var i = 0; i < component.component; i++) {
			fields = fields.concat(flattenComponent(component.component[i].name));
		}
	}

	if (component.field && component.field.length > 0) {
		for (var j = 0; j < component.field.length; j++) {			
			fields.push(component.field[j].name);
		}
	}

	return fields;
	 
}


function isGroup(componentName) {
	var component = _.findWhere(dictionary.fix.components.component, { name: componentName });
	return (component && component.group) ? true : false;
}

function getAllGroupNames() {
	var names = [];
	for (var i = 0; i < dictionary.fix.components.component.length; i++) {
		if (isGroup(dictionary.fix.components.component[i].name)) {
			names.push(dictionary.fix.components.component[i].name);
		}
	}
	return names;
}

function groupFields(groupName) {
	var fields = [];
	var component = _.findWhere(dictionary.fix.components.component, { name: groupName });
	if (!component) {
		console.error('ERROR: Group ' + groupName + ' was not found in data dictionary');
	} else {
		if (component.group.field && component.group.field.length > 0) {
			for (var i = 0; i < component.group.field.length; i++) {
				fields.push(component.group.field[i].name);
			}
		}
		if (component.group.component) {
			fields.push(flattenComponent(component.group.component.name));
		}
	}
	return fields;
}

function resolveFields(fieldArray) {
	
	var targetObj = {};
	var group = [];

	// what message type is this?
	var msgType = _.findWhere(fieldArray, { tag: '35' });	
	if (!msgType) {
		console.error('FATAL: Could not discern message type from message: ' + fieldArray.join(' '));
		process.exit(0);
	}

	var messageDef = _.findWhere(dictionary.fix.messages.message, { msgtype: msgType.val });

	var counter = 0;
	var output = new Array(fieldArray.length);
	while (fieldArray.length > 0) {

	    var field = fieldArray.shift();
	    var key = field.tag;
	    var val = field.val;
		var tagName;
		var tagValue;
		var groupFieldUniverse = [];

		var components = dictionary.fix.components.component;

		var tagDef = _.findWhere(dictionary.fix.fields.field, { number: key } );

		targetObj[key] = mnemonify(key, val).value;

		if (!tagDef) {


		} else {

			var nemo = mnemonify(key, val);			

//			targetObj[nemo.tag] = nemo.value;
	
			if (tagDef.type === 'NUMINGROUP') {



			} else {

			}
		}

	} 
	return targetObj;
}



function processLine(line) {
	var targetObj = resolveFields(extractFields(line));
	if (yaml) {
	    return YAML.stringify(targetObj, 256);
	} else {
	    return pretty ? JSON.stringify(targetObj, undefined, 2) : JSON.stringify(targetObj)
	}
}

function extractFields(record) {
    var fieldArray = [];
    var fields = record.split(delim);
   	var msgType;

	for (var i = 0; i < fields.length; i++) {
    	var both = fields[i].split('=');
		both[0].replace("\n", '').replace("\r", '');

		if (both[1] !== undefined && both[0] !== undefined) {
	    	var val = both[1]; 
	   		fieldArray.push({
		    	tag: both[0],
		    	val: val
		   	});
		}	
    }
    return fieldArray;
}

function mnemonify(tag, val) {
	
	console.log('\n' + tag + '->' + val);

	var tag = _.findWhere(dictionary.fix.fields.field, { number: tag });
	console.log(tag);
	if (!tag) {
		console.log(tag + '->' + val + '\n');
		return {tag: tag, value: val};
	} else {
		if (tag.value && tag.value.length > 0) {
			var numeric = _.contains(NUMERIC_TYPES, tag.type);
			var nemoVal = _.findWhere(tag.value, { enum: val });
			var name = "";
			if (nemoVal && nemoVal.description) {
				name = tag.name;
				value = nemoVal.description.replace(/_/g, ' ');
				console.log(name + '->' + value + '\n');
				return { tag:  name, value: value };
			} else {
				if (numeric) {
					name = tag.name;
					console.log(name + '->' + Number(val) + '\n');
					return { tag: name, value: Number(val) };
				} else {
					name = tag.name;
					console.log(name + '->' + val + '\n');
					return { tag: name, value: val };
				}
			}
		} else {
			var name = tag.name;
			console.log(name + '->' + val + '\n');
			return { tag: name, value: val };
		}
	}
}

function messageFields(messageName) {
    var fields = [];
    var messageDef = _.findWhere(dictionary.fix.messages.message, { name: messageName });

	if (messageDef.field && messageDef.field.length) {
		for (var i = 0; i < messageDef.field.length; i++) {
			fields.push(messageDef.field[i].name);
		}
	}
    return fields;
}

function readDataDictionary(fileLocation) {
    var xml = fs.readFileSync(fileLocation).toString();
	dictionary = JSON.parse(xml2json.toJson(xml));
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
    if (process.argv[1].indexOf('yaml') > 0) {
	    yaml = true;
    }
}

