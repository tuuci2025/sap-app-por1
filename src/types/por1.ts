export interface POR1Row {
  DocEntry: number;
  LineNum: number;
  DocNum: number;
  CardCode: string;
  CardName: string;
  ItemCode: string;
  Dscription: string;
  ShipDate: string;
  OpenQty: number;
  Price: number;
  LineTotal: number;
  WhsCode: string;
}

export interface ApiConfig {
  mode: 'mock' | 'proxy' | 'serviceLayer';
  baseUrl: string;
}

export interface ShipDateChangeLog {
  id?: number;
  timestamp: string;
  updatedBy: string;
  newDate: string;
  rowCount: number;
  rows: { DocEntry: number; LineNum: number; oldDate: string }[];
}