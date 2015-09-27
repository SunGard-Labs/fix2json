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
var rd = {};

checkParams();

try {
	readDataDictionary(dictname);
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

function extractGroups(fields, targetObject) {
	for (var i = 0; i < fields.length; i++) {
		if (_.contains(GROUPS, fields[i].tag)) {
			targetObject[fields[i].tag.substring('No'.length)] = pluckGroup(fields.slice(i), fields[i].tag);
		}
	}
}
	
function pluckGroup(tagArray, groupName) {
	var firstMember;
	var seenMembers = [];
	var groupCount;
	var foundGroups = [];
	var group = {};			
	for (var i = 0; i < tagArray.length; i++) {
		var key = tagArray[i].tag;
		var val = tagArray[i].val;				
		if (i === 0) {
			groupCount = val;
		} else if (_.contains(GROUPS, key)) {
			foundGroups[key.substring('No'.length)] = pluckGroup(tagArray.slice(i), key);
		} else if (i === 1) {
			firstMember = key;
			seenMembers.push(key);
		} else if (key !== firstMember && !_.contains(seenMembers, key)) {
			seenMembers.push(key);
		} else if (key === firstMember && i > 1) {
			foundGroups.push(group);
			group = {};
 			seenMembers = [];
		} else {
			break;
		}
	
		if (i > 0) { 
			group[key] = val;
		}
	}
	return foundGroups;
}

function resolveFields(fieldArray, targetObj) {
	for (var i = 0; i < fieldArray.length; i++) {
		if (_.contains(GROUPS, fieldArray[i].tag)) {
			var groupPropertyName = fieldArray[i].tag.substring('No'.length);
			targetObj[groupPropertyName] = pluckGroup(fieldArray.slice(i), fieldArray[i].tag);
		} else {
			targetObj[fieldArray[i].tag] = fieldArray[i].val;
		}		
	}	
}

function processLine(line) {
	var targetObj = {};
	resolveFields(extractFields(line), targetObj);
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
			var val = mnemonify(tag, both[1]);
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
	// TODO: xpath depends on dictionary version, maybe auto-detect version then come back to dictionary file?

	//var grps = xpath.select("//fix/messages/message/group/@name", dom); // 4.2
	var grps = xpath.select("//fix/components/component/group/@name", dom); // 5.0SP2

	var groupTags = [];	
	for (var i = 0; i < grps.length; i++) {
		groupTags.push(grps[i].value);
	}
	return _.uniq(groupTags);	
}

function readDataDictionary(fileLocation) {

	var xml = fs.readFileSync(fileLocation).toString();
	var dom = new DOMParser().parseFromString(xml);
	var nodes = xpath.select("//fix/fields/field", dom);
	
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

	GROUPS = dictionaryGroups(dom);

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
