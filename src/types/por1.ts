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
