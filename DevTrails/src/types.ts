export interface Section {
  id: string;
  title: string;
  content: string;
  active: boolean;
}

export interface ReadmeData {
  title: string;
  description: string;
  sections: Section[];
}
