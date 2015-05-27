fix2json
=====

## About 

fix2json is a command-line utility to present FIX(TV) protocol message files as JSON.

Some scenarios where fix2json might be of use are:

* Within the ingestion pipeline of trading venue drop copy files into ElasticSearch
* Performing command-line ETL or manipulation of FIX data, often in concert with other CLI utilities such as jq or XMLStarlet
* As a pre-processor for inserting FIX records into JSON-conformant NoSQL repositories, such as Google BigQuery or MongoDB. 

The current level of fix2json semantic naivete is very high.  As such, users should consider ensuring the semantic validity of all FIX messages upstream.

## Install

```bash
npm install -g fix2json
```

## Examples
```bash
$ fix2json
Usage: fix2json <data dictionary xml file> <FIX message file>
```

```bash
$ head -5 /usr/local/lib/node_modules/fix2json/dict/testfiles/100FIX42.dat 
8=FIX.4.29=035=D49=83019956=AZKJ34=057=362052=20150406-12:17:2711=0c968e69-c3ff-4f9f-bc66-9e5ebccd980741=e0568b5c-8bb1-41f0-97bf-5eed32828c241=90964630055=SJM48=46428843022=154=138=7570040=115=USD59=060=20150406-12:17:278201=1207=P10=0
8=FIX.4.29=035=D49=AZKJ56=JGEB34=150=362057=946152=20150406-12:17:2711=3a074d1d-fb06-4eb0-b2f8-0912c5735f65109=8301991=90964630055=SJM48=46428843022=154=138=7570040=115=USD59=08011=0c968e69-c3ff-4f9f-bc66-9e5ebccd980760=20150406-12:17:278201=3207=P10=0
8=FIX.4.29=035=D49=AZKJ56=JGEB34=250=362057=946152=20150406-12:17:2711=3a074d1d-fb06-4eb0-b2f8-0912c5735f6541=335844d8-fc05-41d9-825b-6f3a5059a29b109=8301991=AZKJ90964630055=SJM48=46428843022=154=138=7570040=115=USD59=060=20150406-12:17:278201=1207=P10=0
8=FIX.4.29=035=849=AZKJ56=JGEB34=350=362057=946152=20150406-12:17:2711=3a074d1d-fb06-4eb0-b2f8-0912c5735f6537=ebf9c385-96c6-4e26-9e76-6dc79028a81641=335844d8-fc05-41d9-825b-6f3a5059a29b109=83019976=83019917=f2745db7-77c7-4953-ae77-a69dc81e805a20=039=21=AZKJ90964630055=SJM48=46428843022=154=138=7570040=159=032=7570031=48.14100030=O29=114=757006=$235.0075=20150406-12:17:2760=20150406-12:17:27150=2151=08201=1207=P10=0
8=FIX.4.29=035=D49=37750056=GPFI34=057=884652=20150406-12:17:2711=4345c1d4-1d6c-49ac-a002-6b13ad9ac44341=8b45585e-d957-44d7-87ab-f357814e2cf91=28924520355=AAPL48=46428843022=154=238=5380040=115=USD59=060=20150406-12:17:278201=1207=P10=0
```
```bash
$ fix2json.js /usr/local/lib/node_modules/fix2json/dict/FIX42.xml /usr/local/lib/node_modules/fix2json/dict/testfiles/100FIX42.dat | head -50
[
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
    },
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
...
```


## Caveats

* fix2json makes no semantic judgements about the FIX data being processed and blindly applies the specified data dictionary to the input FIX file.  Feedback from the community on an appropriate level of validation is welcomed.
* fix2json runs out of memory if the provided input file is larger than a certain size.  There are several architectural implications to addressing this issue.  Input is sought from the community as to how this impacts usability of the tool in practice.
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
