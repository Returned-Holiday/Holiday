export type PolicyTable = {
  kind: "table";
  columns: { label: string; width: number }[];
  rows: string[][];
};

export type PolicyList = {
  kind: "numbered";
  items: string[];
};

export type PolicyText = {
  kind: "text";
  paragraphs: string[];
};

export type PolicyBody = PolicyTable | PolicyList | PolicyText;

export type PolicySection = {
  id: string;
  title: string;
  body: PolicyBody;
  collapsed?: boolean;
};

export type PolicyDocumentData = {
  title: string;
  effectiveDate: string;
  lead: string;
  highlights: string[];
  sections: PolicySection[];
};
