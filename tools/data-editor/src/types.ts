export interface DataFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: DataFileNode[];
}
