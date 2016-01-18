#! /usr/bin/env node

var fs = require('fs');
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

// establish Xpaths for the requisite data dictionary versions
var groupXPath = {};
groupXPath['5.0.2'] = '//fix/messages/message';
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
			group.push(member);
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
	if (yaml) {
	    return YAML.stringify(targetObj, 256);
	} else {
	    return pretty ? JSON.stringify(targetObj, undefined, 2) : JSON.stringify(targetObj)
	}
}

function extractFields(record) {
    var fieldArray = [];
    var fields = record.split(delim);
    for (var i = 0; i < fields.length; i++) {
    	var both = fields[i].split('=');
	both[0].replace("\n", '').replace("\r", '');
	if (both[1] !== undefined && both[0] !== undefined) {
	    var val = both[1]; 
	    if (TAGS[both[0]] && TAGS[both[0]].type) {
		val = _.contains(NUMERIC_TYPES, TAGS[both[0]].type) ? Number(val) : val;
	    }
	    val = mnemonify(both[0], val);
	    fieldArray.push({
		    tag: TAGS[both[0]] ? TAGS[both[0]].name : both[0],
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
    
    var msgNodes = xpath.select(groupXPath[FIX_VER], dom);
    for (var j = 0; j < msgNodes.length; j++) {
	
	var components = msgNodes[j].getElementsByTagName('component');
	var msgName = msgNodes[j].attributes[0].value;
	//console.log(msgName);

	for (var k = 0; k < components.length; k++) {

	    //	    console.log('\t' + components[k].attributes[0].value);
	    
	    	    var componentName = components[k].attributes[0].value;

	    //	    console.log('\tcomponentName: ' + componentName);

	    var xpth = '//fix/components/component[@name=\'' + componentName + '\']/group';
	    var componentBlock = xpath.select(xpth, dom);

	    // //fix/components/component[@name='Parties']/component
	    
	}

	/*    
	    for (var l = 0; l < groups.length; l++) {
		
		var groupName = groups[l].attributes[0].value;
		var subType = groups[l].attributes[0].name;
		
		console.log('\t\t' + groupName + " (" + subType + ")");
		

			console.log(xpth);

		var fields = xpath.select(xpth, dom);
		console.log(util.inspect(fields));
		
		
	    }
	*/

	console.log('\n');

    }
    /*    for (var i = 0; i < groupNodes.length; i++) {
	var groupName = groupNodes[i].attributes[0].value;
	console.log('grp: ' + groupName);
	GROUPS[groupName] = [];
	var fields = groupNodes[i].getElementsByTagName('field');
	for (var j = 0; j < fields.length; j++) {
	    var attr = fields[j].attributes[0].value;
	    GROUPS[groupName].push(attr);
	}	
    }
    */
}

function getFixVer(dom) {
    var fixMaj = xpath.select("//fix/@major", dom)[0].value;
    var fixMin = xpath.select("//fix/@minor", dom)[0].value;
    var fixSp = xpath.select("//fix/@servicepack", dom)[0].value;
    FIX_VER = [fixMaj, fixMin, fixSp].join('.');
}

function messageNames(dom) {
    var messages = [];
    var path = '//fix/messages/message';
    var msgs = xpath.select(path, dom);
    
    for (var i = 0; i < msgs.length; i++) {
	messages.push({
	    type: msgs[i].attributes[2].value,
	    name: msgs[i].attributes[0].value
	});
    }
    return messages;
}

function componentNames(messageName, dom) {
    var components = [];
    var path = '//fix/messages/message[@name=\'' + messageName + '\']/component';
    var cmps = xpath.select(path, dom);
    
    for (var i = 0; i < cmps.length; i++) {
	components.push(cmps[i].attributes[0].value);
    }
    return components;
}

function messageFields(messageName, dom) {

    var fields = [];
    var path = '//fix/messages/message[@name=\'' + messageName + '\']/field';
    var flds = xpath.select(path, dom);
    
    for (var i = 0; i < flds.length; i++) {
	fields.push(flds[i].attributes[0].value);
    }
    return fields;

}

function messageComponents(messageName, dom) {

    var components = [];
    var path = '//fix/messages/message[@name=\'' + messageName + '\']/component';
    var cmps = xpath.select(path, dom);
    
    for (var i = 0; i < cmps.length; i++) {
	components.push(cmps[i].attributes[0].value);
    }
    return components;

}

function componentGroups(componentName, dom) {
    var groups = [];
    var path = '//fix/components/component[@name=\'' + componentName + '\']/group';
    var grps = xpath.select(path, dom);
    
    for (var i = 0; i < grps.length; i++) {
	groups.push(grps[i].attributes[0].value);
    }
    return groups;
}

function groupFields(groupName, dom) {
    var fields = [];
    var path = '//fix/components/component/group[@name=\'' + groupName + '\']/field';
    var flds = xpath.select(path, dom);
    
    for (var i = 0; i < flds.length; i++) {
	field.push(flds[i].attributes[0].value);
    }
    return fields;
}

function readDataDictionary(fileLocation) {
    var xml = fs.readFileSync(fileLocation).toString();
    var dom = new DOMParser().parseFromString(xml);
    var nodes = xpath.select("//fix/fields/field", dom);

    var names = messageNames(dom);

    for (var x = 0; x < names.length; x++) {
	console.log(names[x]);
	console.log('\tcomponents: ' + componentNames(names[x].name, dom).join(' / '));
	console.log('\tfields: ' + messageFields(names[x].name, dom).join(' / '));
    }


    process.exit(0);

    getFixVer(dom);
	
    for (var i = 0; i < nodes.length; i++) {
	var tagNumber = nodes[i].attributes[0].value;
	var tagName = nodes[i].attributes[1].value;
	var tagType = nodes[i].attributes[2].value;
	var valElem = nodes[i].getElementsByTagName('value');
	var values = {};
	for (var j = 0; j < valElem.length; j++) {
	    values[valElem[j].attributes[0].value] = valElem[j].attributes[1].value.replace(/_/g, ' ');
	}
	TAGS[tagNumber] = {
	    name: tagName,
	    type: tagType,
	    values: values
	};
    }
    dictionaryGroups(dom);
}
// //fix/messages/message[@name='IOI']/field
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

