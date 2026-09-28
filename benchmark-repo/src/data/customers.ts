export interface Customer {
  id: string;
  name: string;
  email: string;
}

export const customers: readonly Customer[] = [
  { id: "cust_1", name: "Acme Corp", email: "ops@acme.test" },
  { id: "cust_2", name: "Northstar Labs", email: "team@northstar.test" },
  { id: "cust_3", name: "Harbor Systems", email: "hello@harbor.test" },
  { id: "cust_4", name: "Cedar Works", email: "ops@cedar.test" },
  { id: "cust_5", name: "Atlas Studio", email: "team@atlas.test" },
  { id: "cust_6", name: "Juniper Health", email: "ops@juniper.test" },
  { id: "cust_7", name: "Beacon Supply", email: "hello@beacon.test" },
  { id: "cust_8", name: "Fieldwork Co", email: "team@fieldwork.test" },
  { id: "cust_9", name: "Summit Logistics", email: "ops@summit.test" },
  { id: "cust_10", name: "Orchard Software", email: "team@orchard.test" },
  { id: "cust_11", name: "Granite Design", email: "hello@granite.test" },
  { id: "cust_12", name: "Willow Research", email: "ops@willow.test" },
];
