export interface PriceListItem {
  id: string;
  category: string;
  supplier: string;
  description: string;
  cost: number;
  unitPrice: number;
  unit: string;
}

export const CATEGORIES = [
  "ALL",
  "BULLET CAMERA",
  "DOME CAMERA",
  "CAMERA",
  "CABLE",
  "RECORDER",
  "INTERCOM",
  "CABINET",
  "PDU",
  "LAPTOP",
  "ACCESSORIES"
] as const;

export const PRICE_LIST_ITEMS: PriceListItem[] = [
  {
    "id": "prod-1",
    "supplier": "ADS SECURITY DEVICES TRADING LLC",
    "category": "BULLET CAMERA",
    "description": "DS-2CD1043G0-0 (2.8MM) (C) (O-STD)\r\nFM6862018\r\nFM6861790\r\nFN0543664",
    "cost": 140,
    "unitPrice": 182,
    "unit": "Pcs"
  },
  {
    "id": "prod-2",
    "supplier": "ADS SECURITY DEVICES TRADING LLC",
    "category": "DOME CAMERA",
    "description": "DS-2CD1143G0-I (2.8MM) (T2) (O-STD)\r\nFQ9219258, FQ9219261\r\nFQ9219264, FQ9219259\r\nFQ9219252, FM7676336\r\nFQ9219253, FQ9219194\r\nFM7677213, FM6860095",
    "cost": 146,
    "unitPrice": 190,
    "unit": "Pcs"
  },
  {
    "id": "prod-3",
    "supplier": "REALNET TECHNOLOGY TRDG LLC",
    "category": "CABLE",
    "description": "C6 23 305M UTP CABLE CCA DAHUA",
    "cost": 135,
    "unitPrice": 176,
    "unit": "Roll"
  },
  {
    "id": "prod-4",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-2CD1043G2-LIU(2.8MM)",
    "cost": 250,
    "unitPrice": 325,
    "unit": "Pcs"
  },
  {
    "id": "prod-5",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-2CD1043G0-I(2.8MM)",
    "cost": 134,
    "unitPrice": 174,
    "unit": "Pcs"
  },
  {
    "id": "prod-6",
    "supplier": "ADS SECURITY DEVICES TRADING LLC",
    "category": "CAMERA",
    "description": "DS-2CD1143G2-LIU(2.8MM) (O-STD) FH5653783 FH5653784",
    "cost": 165,
    "unitPrice": 215,
    "unit": "Pcs"
  },
  {
    "id": "prod-7",
    "supplier": "REALNET TECHNOLOGY TRDG LLC",
    "category": "CAMERA",
    "description": "Hikvision 4MP IP Dome DS-2CD1143G2-LIU",
    "cost": 165,
    "unitPrice": 215,
    "unit": "Pcs"
  },
  {
    "id": "prod-8",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-2CD1143G0-I(2.8mm)",
    "cost": 137,
    "unitPrice": 178,
    "unit": "Pcs"
  },
  {
    "id": "prod-9",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-2CD1143G2-LIU(2.8mm)",
    "cost": 150,
    "unitPrice": 195,
    "unit": "Pcs"
  },
  {
    "id": "prod-10",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-2CD1047G2H-LIU(2.8mm)",
    "cost": 190,
    "unitPrice": 247,
    "unit": "Pcs"
  },
  {
    "id": "prod-11",
    "supplier": "REALNET TECHNOLOGY TRDG LLC",
    "category": "CAMERA",
    "description": "Hikvision 4MP IP Dome DS-2CD1143GO-I",
    "cost": 145,
    "unitPrice": 189,
    "unit": "Pcs"
  },
  {
    "id": "prod-12",
    "supplier": "DSR TECH COMP. TRDG LLC",
    "category": "CAMERA",
    "description": "DOME CAMERA UNV IPC3614LE-ADF28KC-WL",
    "cost": 210,
    "unitPrice": 273,
    "unit": "Pcs"
  },
  {
    "id": "prod-13",
    "supplier": "ADS SECURITY DEVICES TRDG. LLC",
    "category": "CAMERA",
    "description": "DS-2CD1043G0-I (2.8MM)(T) (O-STD)",
    "cost": 142,
    "unitPrice": 185,
    "unit": "Pcs"
  },
  {
    "id": "prod-14",
    "supplier": "REALNET TECHNOLOGY TRDG LLC",
    "category": "CAMERA",
    "description": "C6 24 305M UTP CABLE DLINK",
    "cost": 290,
    "unitPrice": 377,
    "unit": "Pcs"
  },
  {
    "id": "prod-15",
    "supplier": "SOLID SOLUTION TECHNOLOGY LLC",
    "category": "LAPTOP",
    "description": "DELL U2724D (68.4CM) 27, UK 3 YRS WUE",
    "cost": 1278,
    "unitPrice": 1661,
    "unit": "Pcs"
  },
  {
    "id": "prod-16",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "C6 24 305M UTP CABLE DLINK",
    "cost": 285,
    "unitPrice": 371,
    "unit": "Pcs"
  },
  {
    "id": "prod-17",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "4 PORT MICRO ODF LOADED",
    "cost": 18,
    "unitPrice": 23,
    "unit": "Pcs"
  },
  {
    "id": "prod-18",
    "supplier": "EURO STAR BUILDING MATERIALS TRADING CO. LLC",
    "category": "",
    "description": "CABLE TIE 200X3.6",
    "cost": 7,
    "unitPrice": 9,
    "unit": "Pcs"
  },
  {
    "id": "prod-19",
    "supplier": "AZI TECHNOLOGY LLC",
    "category": "",
    "description": "DELL WD19S 180WDOCKING STATION",
    "cost": 475,
    "unitPrice": 618,
    "unit": "Pcs"
  },
  {
    "id": "prod-20",
    "supplier": "ETW COMPUTER NETWORKS LLC",
    "category": "",
    "description": "SFP MODULE MM",
    "cost": 55,
    "unitPrice": 72,
    "unit": "Pcs"
  },
  {
    "id": "prod-21",
    "supplier": "ETW COMPUTER NETWORKS LLC",
    "category": "",
    "description": "LC TO LC 0M3 5M",
    "cost": 10,
    "unitPrice": 13,
    "unit": "Pcs"
  },
  {
    "id": "prod-22",
    "supplier": "ETW COMPUTER NETWORKS LLC",
    "category": "",
    "description": "LC TO LC 0M3 10M",
    "cost": 18,
    "unitPrice": 23,
    "unit": "Pcs"
  },
  {
    "id": "prod-23",
    "supplier": "ADS SECURITY DEVICES TRADING LLC",
    "category": "",
    "description": "DS-3E0109P-E/M(B)",
    "cost": 123.81,
    "unitPrice": 161,
    "unit": "Pcs"
  },
  {
    "id": "prod-24",
    "supplier": "SFT TRADING LLC",
    "category": "",
    "description": "LC/APC LC/APC SM SX PATCH CORD 1 MTR",
    "cost": 8,
    "unitPrice": 10,
    "unit": "Pcs"
  },
  {
    "id": "prod-25",
    "supplier": "HYVISION TECHNOLOGY LLC",
    "category": "",
    "description": "HK-SFP-1.25G-20-1310",
    "cost": 60,
    "unitPrice": 78,
    "unit": "Pcs"
  },
  {
    "id": "prod-26",
    "supplier": "HYVISION TECHNOLOGY LLC",
    "category": "",
    "description": "HK-SFP-1.25G-20-1550",
    "cost": 76,
    "unitPrice": 99,
    "unit": "Pcs"
  },
  {
    "id": "prod-27",
    "supplier": "QAMAR AL ZEYAN BLDG. MAT.  TRDG.LLC",
    "category": "",
    "description": "SDS PLUS CHANNEL FLAT 14X250",
    "cost": 15,
    "unitPrice": 20,
    "unit": "Pcs"
  },
  {
    "id": "prod-28",
    "supplier": "QAMAR AL ZEYAN BLDG. MAT.  TRDG.LLC",
    "category": "",
    "description": "PVC JUNCTION BOX SNOWLITE 240X190X90",
    "cost": 25,
    "unitPrice": 33,
    "unit": "Pcs"
  },
  {
    "id": "prod-29",
    "supplier": "SEA WONDERS GENERAL TRADING LLC",
    "category": "",
    "description": "ENERGIZER LRA AA 1.5V MAX ALKALINE BATTERY (8+4)PKT",
    "cost": 35,
    "unitPrice": 46,
    "unit": "Pcs"
  },
  {
    "id": "prod-30",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "2 PORT FACEPLATE",
    "cost": 1.5,
    "unitPrice": 2,
    "unit": "Pcs"
  },
  {
    "id": "prod-31",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "RJ11 UTP CONNECTOR 100 PCS",
    "cost": 8,
    "unitPrice": 10,
    "unit": "Pcs"
  },
  {
    "id": "prod-32",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "RJ45 C6 UTP CONNECTOR DLINK",
    "cost": 45,
    "unitPrice": 59,
    "unit": "Pcs"
  },
  {
    "id": "prod-33",
    "supplier": "DSR TECH COMPUTER TRADING LLC",
    "category": "",
    "description": "PHONE GRANDSTREAM SIP GXP1625",
    "cost": 95,
    "unitPrice": 124,
    "unit": "Pcs"
  },
  {
    "id": "prod-34",
    "supplier": "DSR TECH COMPUTER TRADING LLC",
    "category": "",
    "description": "PABX GRANDSTREAM UCM6301",
    "cost": 660,
    "unitPrice": 858,
    "unit": "Pcs"
  },
  {
    "id": "prod-35",
    "supplier": "DSR TECH COMPUTER TRADING LLC",
    "category": "",
    "description": "USB CABLE ANKER A81B5H11 BK",
    "cost": 38,
    "unitPrice": 49,
    "unit": "Pcs"
  },
  {
    "id": "prod-36",
    "supplier": "DSR TECH COMPUTER TRADING LLC",
    "category": "",
    "description": "USB ANKER A8023H111.HK",
    "cost": 38,
    "unitPrice": 49,
    "unit": "Pcs"
  },
  {
    "id": "prod-37",
    "supplier": "ROAD FORCE AUTO SPARE PARTS LLC",
    "category": "",
    "description": "ZT 185/70R14 H04L HS11 EK ZETUM DOT 2023",
    "cost": 285.71,
    "unitPrice": 371,
    "unit": "Pcs"
  },
  {
    "id": "prod-38",
    "supplier": "SPACE AND SCALE TRADING LLC",
    "category": "",
    "description": "50X50 PVC TRUNKING WITH STIKER RED WINTEX",
    "cost": 14.29,
    "unitPrice": 19,
    "unit": "Pcs"
  },
  {
    "id": "prod-39",
    "supplier": "MASTER TECH",
    "category": "",
    "description": "COMMAX CDV-70N2 7 INCH MONITOR",
    "cost": 570,
    "unitPrice": 741,
    "unit": "Pcs"
  },
  {
    "id": "prod-40",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "TP LINK 5 PORT GIGABIT SWITCH LITEWAVE - TL LS1005G",
    "cost": 35,
    "unitPrice": 46,
    "unit": "Pcs"
  },
  {
    "id": "prod-41",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "HIKVISION 8 PORT POE 10/100 SWITCH DS-3E0109P-E/M",
    "cost": 115,
    "unitPrice": 150,
    "unit": "Pcs"
  },
  {
    "id": "prod-42",
    "supplier": "GREEN CIRCLETRADING LLC",
    "category": "",
    "description": "TRUNKING",
    "cost": 12,
    "unitPrice": 16,
    "unit": "Pcs"
  },
  {
    "id": "prod-43",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-2CD1043G2-LIU",
    "cost": 148,
    "unitPrice": 192,
    "unit": "Pcs"
  },
  {
    "id": "prod-44",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "RECORDER",
    "description": "DS-7616NI-Q2",
    "cost": 267,
    "unitPrice": 347,
    "unit": "Pcs"
  },
  {
    "id": "prod-45",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "",
    "description": "WD40PURZ",
    "cost": 210,
    "unitPrice": 273,
    "unit": "Pcs"
  },
  {
    "id": "prod-46",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-3E0105P-E/M/B",
    "cost": 72,
    "unitPrice": 94,
    "unit": "Pcs"
  },
  {
    "id": "prod-47",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "CAMERA",
    "description": "DS-3E0109P-E/M",
    "cost": 113,
    "unitPrice": 147,
    "unit": "Pcs"
  },
  {
    "id": "prod-48",
    "supplier": "INCH SECURITY SOLUTION LLC",
    "category": "INTERCOM",
    "description": "DS-KIS604-P",
    "cost": 520,
    "unitPrice": 676,
    "unit": "Pcs"
  },
  {
    "id": "prod-49",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "ACCESSORIES",
    "description": "1 PORT FACEPLATE D-LINK",
    "cost": 2.5,
    "unitPrice": 3,
    "unit": "Pcs"
  },
  {
    "id": "prod-50",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "CABLE",
    "description": "KEYSTONE JACK CAT6 180 DEGREE D-LINK",
    "cost": 4.9,
    "unitPrice": 6,
    "unit": "Roll"
  },
  {
    "id": "prod-51",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "CABLE",
    "description": "D LINK 24 PORT GIGA SWITCH DGS-1024D",
    "cost": 195,
    "unitPrice": 254,
    "unit": "Roll"
  },
  {
    "id": "prod-52",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "CABLE",
    "description": "D LINK 5 PORT GIGA SWITCH DGS105D",
    "cost": 54,
    "unitPrice": 70,
    "unit": "Roll"
  },
  {
    "id": "prod-53",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "CABLE",
    "description": "C6 24 305 UTP CABLE DLINK",
    "cost": 271,
    "unitPrice": 352,
    "unit": "Roll"
  },
  {
    "id": "prod-54",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "ACCESSORIES",
    "description": "1U BRUSH PANEL",
    "cost": 7,
    "unitPrice": 9,
    "unit": "Pcs"
  },
  {
    "id": "prod-55",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "CABLE",
    "description": "24 PORT C6 UNLOADED PATCH PANEL D-CONNECT",
    "cost": 35,
    "unitPrice": 46,
    "unit": "Roll"
  },
  {
    "id": "prod-56",
    "supplier": "REALNET TECHNOLOGY TRADING LLC",
    "category": "",
    "description": "C6 UTP PATCHCORD 0.25 KUWES",
    "cost": 4.2,
    "unitPrice": 5,
    "unit": "Pcs"
  },
  {
    "id": "prod-57",
    "supplier": "APKR NETWORKING ZONE LLC",
    "category": "PDU",
    "description": "6WAY PDU 1U PLASTIC",
    "cost": 20,
    "unitPrice": 26,
    "unit": "Pcs"
  },
  {
    "id": "prod-58",
    "supplier": "APKR NETWORKING ZONE LLC",
    "category": "CABINET",
    "description": "6U 600X450 WALL CABINET",
    "cost": 120,
    "unitPrice": 156,
    "unit": "Pcs"
  },
  {
    "id": "prod-59",
    "supplier": "SHUA TRADING CO LLC",
    "category": "",
    "description": "BLUEFIELD-BF116130267 MAGNETIC LOCK 300LBS/180KG(2-CONNECTION",
    "cost": 65,
    "unitPrice": 85,
    "unit": "Pcs"
  },
  {
    "id": "prod-60",
    "supplier": "SHUA TRADING CO LLC",
    "category": "",
    "description": "BLUEFIELD-BF1161302124 L AND Z BRACKET FOR MAG LOCK 300 LBSBS/180KG",
    "cost": 25,
    "unitPrice": 33,
    "unit": "Pcs"
  },
  {
    "id": "prod-61",
    "supplier": "SHUA TRADING CO LLC",
    "category": "",
    "description": "BLUEFIELD BF116302266-CENTRAL ACCESS CONTROL POWER SUPPLY DC12V-5AH",
    "cost": 45,
    "unitPrice": 59,
    "unit": "Pcs"
  },
  {
    "id": "prod-62",
    "supplier": "SHUA TRADING CO LLC",
    "category": "",
    "description": "BLUEFIELD-BF1161302330 IP68 WATERPROOF TUYA ACCESS CONTROL READER",
    "cost": 260,
    "unitPrice": 338,
    "unit": "Pcs"
  },
  {
    "id": "prod-63",
    "supplier": "SHUA TRADING CO LLC",
    "category": "",
    "description": "BLUEFIELD-BF1161302330 TUYA BLUETOOTH BLUEFIELD ACCESS CONTROL READER",
    "cost": 250,
    "unitPrice": 325,
    "unit": "Pcs"
  },
  {
    "id": "prod-64",
    "supplier": "SHUA TRADING CO LLC",
    "category": "",
    "description": "BLUEFIELD -BF116130271 U BRACKET FOR MAG LOCK 600 LBS/280KG",
    "cost": 25,
    "unitPrice": 33,
    "unit": "Pcs"
  },
  {
    "id": "prod-65",
    "supplier": "VOSTOK TRADING LLC",
    "category": "",
    "description": "ST4000VX016\r\nSeagate SkyHawk (Surveillance) 3.5\" SATA 4TB 6Gb/s\r\n5900rpm 64MB RAM",
    "cost": 425,
    "unitPrice": 553,
    "unit": "Pcs"
  },
  {
    "id": "prod-66",
    "supplier": "VOSTOK TRADING LLC",
    "category": "",
    "description": "CT500BX500SSD1\r\nCrucial 500GB SSD 2.5\"",
    "cost": 275,
    "unitPrice": 358,
    "unit": "Pcs"
  },
  {
    "id": "prod-67",
    "supplier": "VOSTOK TRADING LLC",
    "category": "",
    "description": "Prime B760\r\nPlus (Mother Board)",
    "cost": 2500,
    "unitPrice": 3250,
    "unit": "Pcs"
  },
  {
    "id": "prod-68",
    "supplier": "VOSTOK TRADING LLC",
    "category": "",
    "description": "MA016\r\nFB 16 461A Snappy 750W Power Supply",
    "cost": 325,
    "unitPrice": 423,
    "unit": "Pcs"
  }
];
