#! /usr/bin/env node

var fs = require('fs')
var xpath = require('xpath');
var _ = require('underscore');
var DOMParser = require('xmldom').DOMParser;
var readline = require('readline');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder();
var delim = String.fromCharCode(01); // ASCII start-of-header
var pretty = false;
var dictname;	
var filename;
var TAGS = {};
var GROUPS = {};
var FIX_VER = undefined;
var rd = {};

checkParams();

// establish Xpaths for the requisite data dictionary version
var groupXPath = {};
groupXPath['5.0.2'] = '//fix/components/component/group';
groupXPath['5.0.1'] = '//fix/components/component/group';
groupXPath['5.0.0'] = '//fix/components/component/group';
groupXPath['4.2.0'] = '//fix/messages/message/group';;
groupXPath['4.4.0'] = '//fix/messages/message/group';
groupXPath['1.1.0'] = '//fix/messages/message/group';

try {
	readDataDictionary(dictname);
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
			group.push(JSON.parse(JSON.stringify(member)));
 			return group;
		} else {
			member[key] = val;
		}
		idx++;
	}

}

function resolveFields(fieldArray) {
	targetObj = {};
	var group = [];
	while (fieldArray.length > 0) {
		var field = fieldArray.shift();
		var key = field.tag;
		var val = field.val;
		if (_.contains(Object.keys(GROUPS), key)) {
			targetObj[key] = val;
			var newGroup = pluckGroup(fieldArray, key);
		 	targetObj[key.substring('No'.length)] = newGroup;
		} else {
			targetObj[key] = val;
		}
	} 
	return targetObj;
}

function processLine(line) {
	var targetObj = resolveFields(extractFields(line));
	return pretty ? JSON.stringify(targetObj, undefined, 4) : JSON.stringify(targetObj);
}

function extractFields(record) {
	var fieldArray = [];
	var fields = record.split(delim);
	for (var i = 0; i < fields.length; i++) {
    	var both = fields[i].split('=');
		both[0].replace("\n", '').replace("\r", '');
		if (both[1] !== undefined) {
			var tag = TAGS[both[0]] ? TAGS[both[0]].name : both[0];
			var val = mnemonify(both[0], both[1]);
			fieldArray.push({
				tag: tag, 
				val: val
			});
		}	
	}
	return fieldArray;
}

function mnemonify(tag, val) {
	return TAGS[tag] ? (TAGS[tag].values ? (TAGS[tag].values[val] ? TAGS[tag].values[val] : val) : val) : val;
}

function dictionaryGroups(dom) {
	var groupNodes = xpath.select(groupXPath[FIX_VER], dom);
	for (var i = 0; i < groupNodes.length; i++) {
		var groupName = groupNodes[i].attributes[0].value;
		GROUPS[groupName] = [];
		var fields = groupNodes[i].getElementsByTagName('field');
		for (var j = 0; j < fields.length; j++) {
			var attr = fields[j].attributes[0].value;
			GROUPS[groupName].push(attr);
		}		
	}
}

function getFixVer(dom) {
	var fixMaj = xpath.select("//fix/@major", dom)[0].value;
	var fixMin = xpath.select("//fix/@minor", dom)[0].value;
	var fixSp = xpath.select("//fix/@servicepack", dom)[0].value;
   	FIX_VER = [fixMaj, fixMin, fixSp].join('.');
}

function readDataDictionary(fileLocation) {
	var xml = fs.readFileSync(fileLocation).toString();
	var dom = new DOMParser().parseFromString(xml);
	var nodes = xpath.select("//fix/fields/field", dom);

	getFixVer(dom);
	
	for (var i = 0; i < nodes.length; i++) {
		var tagNumber = nodes[i].attributes[0].value
		var tagName = nodes[i].attributes[1].value;
		var valElem = nodes[i].getElementsByTagName('value');
		var values = {};
	
		for (var j = 0; j < valElem.length; j++) {
			values[valElem[j].attributes[0].value] = valElem[j].attributes[1].value.replace(/_/g, ' ');
		}

		TAGS[tagNumber] = {
			name: tagName,
			values: values
		};
	}
	dictionaryGroups(dom);
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
