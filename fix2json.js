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
var MESSAGES = [];
var FIX_VER = undefined;
var rd = {};
var yaml = false;

var NUMERIC_TYPES = ['FLOAT', 'AMT', 'PRICE', 'QTY', 'INT', 'SEQNUM', 'NUMINGROUP', 'LENGTH', 'PRICEOFFSET'];

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
 	    var msg = decoder.write(processLine(line));
	    console.log(msg);
        }
    });

} catch (mainException) {
    console.error("Error in main routine: " + mainException);
    process.exit(1);
}

function pluckGroup(tagArray, messageType, groupName, numInGroup) {
    
    var group = [];
    var member = {};
    var firstProp = undefined;
    var idx = 0;
    var groupFields = GROUPS[messageType][groupName];
    var groupAnchor;

    var idx = 0;
	
    var tag = tagArray.shift();
    groupAnchor = tag.tag; // first one

    do {	
	
	var key = (groupAnchor && idx > 0) ? tag.tag : groupAnchor;
	var val = tag.val;
	var num = tag.num;

	var found = _.contains(groupFields, key);
	var type = TAGS[num].type;
	
	if (idx === 0) {

	    groupAnchor = key;
	    member[key] = val;
	    tag = tagArray.shift();
	    idx++;
	    continue;

	} else if (groupAnchor === key) {

	    group.push(member);
	    member = {};
	    member[key] = val;
	    tag = tagArray.shift();
	    idx++;
	    continue;

	} else if (type === 'NUMINGROUP') {
		
		member[key] = val;
		member[key.substring('No'.length)] = pluckGroup(tagArray, messageType, key, val);
		continue;
		

	} else if (!_.contains(groupFields, key))  {

	    group.push(member);
	    tagArray.unshift(tag); // put this guy back
	    return group;

	} else {
	    member[key] = val;
	    tag = tagArray.shift();
	    idx++;
	    continue;
	}


    } while (group.length < numInGroup || tagArray.length > 0);

}

function resolveFields(fieldArray) {

    targetObj = {};
    var group = [];
    
    var msgType = _.findWhere(fieldArray, { tag: 'MsgType' });
    var msgTypeName = _.findWhere(MESSAGES, { type: msgType.raw });
    var refGroups = GROUPS[msgTypeName.name];

    while (fieldArray.length > 0) {
        
	var field = fieldArray.shift();
	var key = field.tag;
        var val = field.val;
	var raw = field.raw;
	var num = field.num;

	targetObj[key] = val;

        if (_.contains(Object.keys(refGroups), key)) {	    
            var newGroup = pluckGroup(fieldArray, msgTypeName.name, key, val);	    
	    targetObj[key.substring('No'.length)] = newGroup;
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
				val: val,
				num: both[0],
      			raw: both[1]
	    });
        }
    }

    //        console.log(fieldArray);
    return fieldArray;

}

function mnemonify(tag, val) {
    return TAGS[tag] ? (TAGS[tag].values ? (TAGS[tag].values[val] ? TAGS[tag].values[val] : val) : val) : val;
}

function dictionaryGroups(dom) {
    
    var components = xpath.select('//fix/components/component', dom);
    var componentGroupFields = {};

    for (var j = 0; j < components.length; j++) {
	var componentName = components[j].attributes[0].value;
	componentGroupFields[componentName] = {};
	var componentGroups = components[j].getElementsByTagName('group');
    
	for (var k = 0; k < componentGroups.length; k++) {

	    var componentGroupName = componentGroups[k].attributes[0].value;
	    componentGroupFields[componentName][componentGroupName] = [];
	    var groupFields = componentGroups[k].getElementsByTagName('field');
	    
	    for (var l = 0; l < groupFields.length; l++) {
		var fieldName = groupFields[l].attributes[0].value;
	    
		componentGroupFields[componentName][componentGroupName].push(fieldName);		
	    }
	}
    }

    var names = messageNames(dom);
    var messages = xpath.select('//fix/messages/message', dom);

    for (var m = 0; m < messages.length; m++) {
	var messageName = messages[m].attributes[0].value;
	GROUPS[messageName] = {};
	var messageComponents = messages[m].getElementsByTagName('component');
	for (var n = 0; n < messageComponents.length; n++) {
	    var componentName = messageComponents[n].attributes[0].value;
	    var groupNames = Object.keys(componentGroupFields[componentName]);
	    
	    for (o = 0; o < groupNames.length; o++) { // collapse fields into GROUPS index
		GROUPS[messageName][groupNames[o]] = componentGroupFields[componentName][groupNames[o]];
	    }
	}
    }

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

    MESSAGES = messages;

}

function readDataDictionary(fileLocation) {

    var xml = fs.readFileSync(fileLocation).toString();
    var dom = new DOMParser().parseFromString(xml);
    var nodes = xpath.select("//fix/fields/field", dom);

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

    messageNames(dom);
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
    if (process.argv[1].indexOf('yaml') > 0) {
        yaml = true;
    }

}
