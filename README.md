fix2json
=====

# NOTE

This repository is planned for public archival on 01 June 2023. As an alternative, please consider the [Market Data Transcoder](https://github.com/GoogleCloudPlatform/market-data-transcoder).

## About 

fix2json is a command-line utility to present FIX(TV) protocol message files as JSON or YAML (fix2yaml).

Some scenarios where fix2json might be of use are:

* Within the ingestion pipeline of trading venue drop copy files into ElasticSearch

* Performing command-line ETL or manipulation of FIX data, often in concert with other CLI utilities such as jq or XMLStarlet

* As a pre-processor for inserting FIX records into JSON-conformant NoSQL repositories, such as Google BigQuery or MongoDB. 

fix2json does not attempt any affirmative context validation, although syntax validation is performed as required for parsing of repeating groups.   As such, users should consider ensuring the contextual validity of all FIX messages upstream.  For satisfactory results, fix2json should be paired with the appropriate target FIX version data dictionary.

There is a high likelihood that the data dictionaries in ```dict``` will need to be adjusted to conform to the FIX specification of the particular message generator.  In particular, the processing of repeating groups relys upon the specified dictionary to determine the end of any particular group.  If the FIX message data uses custom fields that are not present in the supplied data dictionary, the dictionary really should be patched accordingly.  See the files ```dict/FIX50SP2.CME.xml``` and ```dict/FIX42-bloomberg-step.xml``` for examples of vendor-specific tags retroactively patched to a stock QuickFIX XML data dictionary. 

## Install

```bash
npm install -g fix2json
```
## Examples
```bash
$ fix2json
Usage: fix2json [-p] <data dictionary xml file> [<path to FIX message file>]

$ fix2json -p dict/FIX50SP2.CME.xml XCME_MD_GE_FUT_20160315.gz 
{
  "ApplVerID": "FIX50SP2",
  "BodyLength": 131,
  "MsgType": "SECURITYSTATUS",
  "SenderCompID": "CME",
  "MsgSeqNum": 9750889,
  "SendingTime": "20160314214500018844412",
  "TransactTime": "20160314214500001407698",
  "TradeDate": "20160315",
  "MatchEventIndicator": "00000000",
  "SecurityGroup": "GE",
  "SecurityTradingStatus": "PRE OPEN",
  "HaltReasonInt": "NEWS DISSEMINATION",
  "SecurityTradingEvent": "CHANGE OF TRADING SESSION",
  "CheckSum": "083"
}
{
  "ApplVerID": "FIX50SP2",
  "BodyLength": 182,
  "MsgType": "MARKETDATAINCREMENTALREFRESH",
  "SenderCompID": "CME",
  "TradeDate": "20160315",
  "MsgSeqNum": 9751026,
  "SendingTime": "20160314214500474778917",
  "TransactTime": "20160314214500474587143",
  "MatchEventIndicator": "00000100",
  "NoMDEntries": 1,
  "MDEntries": [
    {
      "MDUpdateAction": "CHANGE",
      "MDEntryType": "OFFER",
      "SecurityID": "801250",
      "Symbol": "GEH7",
      "RptSeq": 1501314,
      "MDEntryPx": 9894.5,
      "MDEntrySize": 665,
      "NumberOfOrders": 9,
      "MDPriceLevel": 1
    }
  ],
  "CheckSum": "226"
}
{
  "ApplVerID": "FIX50SP2",
  "BodyLength": 183,
  "MsgType": "MARKETDATAINCREMENTALREFRESH",
  "SenderCompID": "CME",
  "TradeDate": "20160315",
  "MsgSeqNum": 9751027,
  "SendingTime": "20160314214500474803975",
  "TransactTime": "20160314214500474666839",
  "MatchEventIndicator": "00000100",
  "NoMDEntries": 1,
  "MDEntries": [
    {
      "MDUpdateAction": "CHANGE",
      "MDEntryType": "OFFER",
      "SecurityID": "801075",
      "Symbol": "GEU6",
      "RptSeq": 1151986,
      "MDEntryPx": 9911.5,
      "MDEntrySize": 817,
      "NumberOfOrders": 13,
      "MDPriceLevel": 1
    }
  ],
  "CheckSum": "040"
}
{
  "ApplVerID": "FIX50SP2",
  "BodyLength": 183,
  "MsgType": "MARKETDATAINCREMENTALREFRESH",
  "SenderCompID": "CME",
  "TradeDate": "20160315",
  "MsgSeqNum": 9751028,
  "SendingTime": "20160314214500475466516",
  "TransactTime": "20160314214500475387568",
  "MatchEventIndicator": "00000100",
  "NoMDEntries": 1,
  "MDEntries": [
    {
      "MDUpdateAction": "CHANGE",
      "MDEntryType": "OFFER",
      "SecurityID": "800971",
      "Symbol": "GEM6",
      "RptSeq": 940052,
      "MDEntryPx": 9920.5,
      "MDEntrySize": 3438,
      "NumberOfOrders": 18,
      "MDPriceLevel": 1
    }
  ],
  "CheckSum": "030"
}
...

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


$ head -1 testfiles/100FIX42.dat | fix2json -p dict/FIX42.xml 
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

$ head -3 MDFF_CME_20130714-20130715_7819_0 | fix2yaml -p dict/FIX50SP2.CME.xml
ApplVerID: FIX50SP2
BodyLength: 274
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
MsgSeqNum: 2918
SendingTime: '20130714212647805'
TradeDate: '20130715'
NoMDEntries: 3
MDEntries:
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '2975'
        RptSeq: 6
        SecurityDesc: 6EU4
        MDEntryType: 'SIMULATED SELL PRICE'
        MDEntryPx: 13157
        MDEntryTime: '212647000'
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '2975'
        RptSeq: 7
        SecurityDesc: 6EU4
        MDEntryType: 'SIMULATED BUY PRICE'
        MDEntryPx: 13069
        MDEntryTime: '212647000'
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '2975'
        RptSeq: 8
        SecurityDesc: 6EU4
        MDEntryType: OFFER
        MDEntryPx: 13157
        MDEntrySize: 10
        MDEntryTime: '212647000'
        TradingSessionID: '0'
        NumberOfOrders: 1
        MDPriceLevel: 1
CheckSum: '092'

ApplVerID: FIX50SP2
BodyLength: 277
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
MsgSeqNum: 2916
SendingTime: '20130714212639044'
TradeDate: '20130715'
NoMDEntries: 3
MDEntries:
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '22195'
        RptSeq: 6
        SecurityDesc: 6EZ4
        MDEntryType: 'SIMULATED SELL PRICE'
        MDEntryPx: 13171
        MDEntryTime: '212639000'
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '22195'
        RptSeq: 7
        SecurityDesc: 6EZ4
        MDEntryType: 'SIMULATED BUY PRICE'
        MDEntryPx: 13083
        MDEntryTime: '212639000'
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '22195'
        RptSeq: 8
        SecurityDesc: 6EZ4
        MDEntryType: OFFER
        MDEntryPx: 13171
        MDEntrySize: 10
        MDEntryTime: '212639000'
        TradingSessionID: '0'
        NumberOfOrders: 1
        MDPriceLevel: 1
CheckSum: '227'

ApplVerID: FIX50SP2
BodyLength: 134
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
MsgSeqNum: 1371
SendingTime: '20130714180142945'
TradeDate: '20130715'
NoMDEntries: 1
MDEntries:
    -
        MDUpdateAction: NEW
        SecurityIDSource: 'EXCHANGE SYMBOL'
        SecurityID: '9296'
        SettlDate: '20130712'
        RptSeq: 1
        SecurityDesc: 6EH4
        MDEntryType: 'SETTLEMENT PRICE'
        MDEntryPx: 13077
        MDEntryTime: '180142000'
CheckSum: '107'

# If streaming gzipped files over the network, let gunzip do the uncompression

$ curl -s ftp://ftp.cmegroup.com/sbe_sample_data/historical_data/XCBT_MD_ZS_FUT_20160315.gz| gunzip - | fix2yaml -p dict/FIX50SP2.CME.xml
ApplVerID: FIX50SP2
BodyLength: 278
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
TradeDate: '20160315'
MsgSeqNum: 3254145
SendingTime: '20160314214500015068553'
TransactTime: '20160314214500001107404'
MatchEventIndicator: '00001000'
NoMDEntries: 3
MDEntries:
    -
        MDUpdateAction: NEW
        MDEntryType: 'OPENING PRICE'
        SecurityID: '827723'
        Symbol: ZSK6
        RptSeq: 717363
        MDEntryPx: 894.25
        OpenCloseSettlFlag: 'THEORETICAL PRICE VALUE'
    -
        MDUpdateAction: NEW
        MDEntryType: 'OPENING PRICE'
        SecurityID: '401316'
        Symbol: ZSN6
        RptSeq: 621346
        MDEntryPx: 898
        OpenCloseSettlFlag: 'THEORETICAL PRICE VALUE'
    -
        MDUpdateAction: NEW
        MDEntryType: 'OPENING PRICE'
        SecurityID: '253214'
        Symbol: ZSX6
        RptSeq: 617653
        MDEntryPx: 904.5
        OpenCloseSettlFlag: 'THEORETICAL PRICE VALUE'
CheckSum: '098'

ApplVerID: FIX50SP2
BodyLength: 131
MsgType: SECURITYSTATUS
SenderCompID: CME
MsgSeqNum: 3254151
SendingTime: '20160314214500017078341'
TransactTime: '20160314214500001107404'
TradeDate: '20160315'
MatchEventIndicator: '00000000'
SecurityGroup: ZS
SecurityTradingStatus: 'PRE OPEN'
HaltReasonInt: 'NEWS DISSEMINATION'
SecurityTradingEvent: 'CHANGE OF TRADING SESSION'
CheckSum: '072'

ApplVerID: FIX50SP2
BodyLength: 180
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
TradeDate: '20160315'
MsgSeqNum: 3254163
SendingTime: '20160314214500086778208'
TransactTime: '20160314214500086645710'
MatchEventIndicator: '00000100'
NoMDEntries: 1
MDEntries:
    -
        MDUpdateAction: CHANGE
        MDEntryType: OFFER
        SecurityID: '827723'
        Symbol: ZSK6
        RptSeq: 717364
        MDEntryPx: 895.75
        MDEntrySize: 12
        NumberOfOrders: 7
        MDPriceLevel: 5
CheckSum: '156'

ApplVerID: FIX50SP2
BodyLength: 178
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
TradeDate: '20160315'
MsgSeqNum: 3254164
SendingTime: '20160314214500088853511'
TransactTime: '20160314214500088741888'
MatchEventIndicator: '00000100'
NoMDEntries: 1
MDEntries:
    -
        MDUpdateAction: NEW
        MDEntryType: OFFER
        SecurityID: '401316'
        Symbol: ZSN6
        RptSeq: 621347
        MDEntryPx: 902
        MDEntrySize: 1
        NumberOfOrders: 1
        MDPriceLevel: 2
CheckSum: '025'

ApplVerID: FIX50SP2
BodyLength: 179
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
TradeDate: '20160315'
MsgSeqNum: 3254165
SendingTime: '20160314214500505311711'
TransactTime: '20160314214500505220176'
MatchEventIndicator: '00000100'
NoMDEntries: 1
MDEntries:
    -
        MDUpdateAction: CHANGE
        MDEntryType: BID
        SecurityID: '253214'
        Symbol: ZSX6
        RptSeq: 617654
        MDEntryPx: 898
        MDEntrySize: 21
        NumberOfOrders: 2
        MDPriceLevel: 9
CheckSum: '078'

ApplVerID: FIX50SP2
BodyLength: 178
MsgType: MARKETDATAINCREMENTALREFRESH
SenderCompID: CME
TradeDate: '20160315'
MsgSeqNum: 3254166
SendingTime: '20160314214500524996190'
TransactTime: '20160314214500524917388'
MatchEventIndicator: '00000100'
NoMDEntries: 1
MDEntries:
    -
        MDUpdateAction: NEW
        MDEntryType: OFFER
        SecurityID: '122779'
        Symbol: ZSQ6
        RptSeq: 553424
...
```

## Notes

* Gzipped files being read from the filesystem and having a .gz extension will be uncompressed automatically 

* Data dictionary discrepancies will throw a monkeywrench into the processing of repeating groups.  This is because fix2json refers back to the data dictionary during repeating group processing to determine when any individual group tags ends.  However, if a group member contains a tag does not reside in the specified dictionary, fix2json will truncate the group prematurely, triggering rage in its victims.  In this case, the best approach is to reconcile the data dictionaries employed and adjusted the dictionary accordingly.  Unrecognized individual tags (not part of a repeating group) will simply be represented as the FIX tag number and its corresponding value, indicating a data dictionary mismatch less destructively.

* fix2json makes few semantic judgements about the FIX data being processed and blindly applies the specified data dictionary to the input FIX file.  Feedback from the community on an appropriate level of validation is welcomed.

* fix2json uses streams instead of loading up the entire source file in one go.  This means that you can process 2G+ files and receive output almost immediately.  What this also means is that fix2json does not emit a canonical JSON array as it's output.  Individual JSON objects will be output that correspond to the individual messages in the source file.  For this reason, pretty printing is disabled by default.  Use ```-p``` as the first argument for pretty printed output JSON.

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
Copyright © FIS 2015-2016. Licensed under the MIT license.
