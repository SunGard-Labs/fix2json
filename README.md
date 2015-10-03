fix2json
=====

## About 

fix2json is a command-line utility to present FIX(TV) protocol message files as JSON.

Some scenarios where fix2json might be of use are:

* Within the ingestion pipeline of trading venue drop copy files into ElasticSearch

* Performing command-line ETL or manipulation of FIX data, often in concert with other CLI utilities such as jq or XMLStarlet

* As a pre-processor for inserting FIX records into JSON-conformant NoSQL repositories, such as Google BigQuery or MongoDB. 

The current level of fix2json semantic naivete is very high.  As such, users should consider ensuring the semantic validity of all FIX messages upstream.

There is a high likelihood that the data dictionaries employed will need to be adjusted to conform to the FIX specification of the particular message generator.  In particular, handling of repeating groups uses the specified dictionary to determine the end of any particular group by checking whether the current field is registered under that group within the data dictionary.  If the FIX messages use custom fields that do not exist in the supplied data dictionary, the dictionary should be patched accordingly.  Ungrouped fields not found within the dictionary's group defition will simply render as the tag number and tag value (see example below.)

## Install

```bash
npm install -g fix2json
```
## Examples
```bash
$ fix2json
Usage: fix2json [-p] <data dictionary xml file> [<path to FIX message file>]

$ cat secdef.dat | head -10 | tail -1 | fix2json -p dict/FIX50SP2.xml 
{
    "5796": "20151001",
    "5799": "00000000",
    "6937": "BR:DDM",
    "9779": "N",
    "9787": "1.0000000",
    "9800": "2",
    "MsgType": "SECURITYDEFINITION",
    "SecurityUpdateAction": "MODIFY",
    "LastUpdateTime": "20151001173404000000",
    "ApplID": "510",
    "MarketSegmentID": "12",
    "UnderlyingProduct": "14",
    "SecurityExchange": "XBMF",
    "SecurityGroup": "BR:P3",
    "Symbol": "BR:DDMQ20",
    "SecurityID": "20030266",
    "SecurityIDSource": "EXCHANGE SYMBOL",
    "SecurityType": "FUTURE",
    "CFICode": "FFFCSX",
    "MaturityMonthYear": "202008",
    "Currency": "BRL",
    "SettlCurrency": "BRL",
    "MatchAlgorithm": "F",
    "MinTradeVol": "5",
    "MaxTradeVol": "1000",
    "MinPriceIncrement": "0.0100000",
    "SettlPriceType": "10000000",
    "NoEvents": "2",
    "Events": [
        {
            "EventType": "ACTIVATION",
            "EventTime": "20150529000000000000"
        },
        {
            "EventType": "LAST ELIGIBLE TRADE DATE",
            "EventTime": "20200731211000000000",
            "NoMDFeedTypes": "1",
            "MDFeedTypes": [
                {
                    "MDFeedType": "GBX",
                    "MarketDepth": "10",
                    "NoInstrAttrib": "1",
                    "InstrAttrib": [
                        {
                            "InstrAttribType": "TRADE TYPE ELIGIBILITY DETAILS FOR SECURITY",
                            "InstrAttribValue": "00000000000000000000000000000001",
                            "NoLotTypeRules": "1",
                            "LotTypeRules": [
                                {
                                    "LotType": "ROUND LOT BASED UPON UNITOFMEASURE",
                                    "MinLotSize": "5.0000"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    "LowLimitPrice": "5.2800000",
    "TradingReferencePrice": "7.2700000",
    "HighLimitPrice": "9.2800000"
}


$ fix2json dict/FIX42.xml fixmsg_11212014.txt | mongoimport --drop --collection FIX
connected to: 127.0.0.1
2015-08-20T15:19:21.465-0400 dropping: test.FIX
2015-08-20T15:19:24.013-0400             15600	5200/second
2015-08-20T15:19:27.000-0400 			34600	5766/second
2015-08-20T15:19:30.005-0400 			53400	5933/second
2015-08-20T15:19:33.009-0400 			72900	6075/second
2015-08-20T15:19:36.005-0400 			88500	5900/second
2015-08-20T15:19:39.010-0400 			108200	6011/second
2015-08-20T15:19:42.005-0400 			127300	6061/second
2015-08-20T15:19:45.001-0400 			146800	6116/second
2015-08-20T15:19:48.001-0400 			166000	6148/second
2015-08-20T15:19:51.429-0400 			183600	6120/second
2015-08-20T15:19:54.010-0400 			200200	6066/second
2015-08-20T15:19:55.980-0400 check 9 212993
2015-08-20T15:19:55.981-0400 imported 212993 objects


$ head -1 testfiles/100FIX42.dat | ./fix2json.js -p dict/FIX42.xml 
{
    "8201": "1",
    "Account": "909646300",
    "BeginString": "FIX.4.2",
    "BodyLength": "0",
    "CheckSum": "0",
    "ClOrdID": "0c968e69-c3ff-4f9f-bc66-9e5ebccd9807",
    "Currency": "USD",
    "IDSource": "CUSIP",
    "MsgSeqNum": "0",
    "MsgType": "ORDER SINGLE",
    "OrderQty": "75700",
    "OrdType": "MARKET",
    "OrigClOrdID": "e0568b5c-8bb1-41f0-97bf-5eed32828c24",
    "SecurityID": "464288430",
    "SenderCompID": "830199",
    "SendingTime": "20150406-12:17:27",
    "Side": "BUY",
    "Symbol": "SJM",
    "TargetCompID": "AZKJ",
    "TargetSubID": "3620",
    "TimeInForce": "DAY",
    "TransactTime": "20150406-12:17:27",
    "SecurityExchange": "P"
}


```

## Notes

* Data dictionary discrepancies will throw a monkeywrench into the processing of repeating groups.  This is because fix2json refers back to the data dictionary during group processing in order to determine when the group member tags end.  However, if a group member contains a tag does not reside in the current dictionary under the particular group being processed, fix2json will truncate the group prematurely, triggering rage in its victims.  In this case, the best approach at the moment is to reconcile the data dictionaries employed the particular FIX specification of the entity originating the FIX data, and adjusted the dictionaries accordingly.  Unrecognized individual tags will simply be represented as the FIX tag number and its corresponding value, indicating a data dictionary mismatch less destructively.

* fix2json makes few semantic judgements about the FIX data being processed and blindly applies the specified data dictionary to the input FIX file.  Feedback from the community on an appropriate level of validation is welcomed.

* fix2json now uses streams instead of loading up the entire source file in one go.  This means that you can process a 2G+ file starting immediately.  What this also means is that fix2json no longer returns a proper JSON array as it's output.  Individual JSON objects will be output that correspond to the individual messages in the source file.  For this reason, pretty printing is disabled by default.  Use ```-p``` as the first argument to pretty print the output JSON.

* fix2json will replace underscores ('_') with spaces (' ') for all mnemonic tag descriptions found in the input data dictionary.  Hence, a description for EventType will be in the data dictionary as "LAST_ELIGIBLE_TRADE_DATE", but will be interpreted by fix2json as "LAST ELIGIBLE TRADE DATE"

## See Also

* [FIX Protocol](http://fixprotocol.org)
* [FixSpec.com Developer Tools](https://fixspec.com/developers)
* [FIX on Wikipedia](http://en.wikipedia.org/wiki/Financial_Information_eXchange)
* [json CLI](https://github.com/trentm/json)
* [jq CLI](https://github.com/stedolan/jq)

## License
MIT. See license text in [LICENSE](LICENSE).

## Copyrights and Names
Copyright © SunGard 2015. Licensed under the MIT license.


