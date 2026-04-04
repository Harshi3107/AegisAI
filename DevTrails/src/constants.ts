import { Section } from './types';

export const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'title',
    title: 'Title and Description',
    content: '# Project Title\n\nA brief description of what this project does and who it is for.',
    active: true,
  },
  {
    id: 'installation',
    title: 'Installation',
    content: '## Installation\n\nInstall my-project with npm\n\n```bash\n  npm install my-project\n  cd my-project\n```',
    active: false,
  },
  {
    id: 'usage',
    title: 'Usage/Examples',
    content: '## Usage/Examples\n\n```javascript\nimport { myComponent } from \'my-project\'\n\nfunction App() {\n  return <myComponent />\n}\n```',
    active: false,
  },
  {
    id: 'features',
    title: 'Features',
    content: '## Features\n\n- Light/dark mode toggle\n- Live previews\n- Fullscreen mode\n- Cross platform',
    active: false,
  },
  {
    id: 'api',
    title: 'API Reference',
    content: '## API Reference\n\n#### Get all items\n\n```http\n  GET /api/items\n```\n\n| Parameter | Type     | Description                |\n| :-------- | :------- | :------------------------- |\n| `api_key` | `string` | **Required**. Your API key |\n\n#### Get item\n\n```http\n  GET /api/items/${id}\n```\n\n| Parameter | Type     | Description                       |\n| :-------- | :------- | :-------------------------------- |\n| `id`      | `string` | **Required**. Id of item to fetch |',
    active: false,
  },
  {
    id: 'contributing',
    title: 'Contributing',
    content: '## Contributing\n\nContributions are always welcome!\n\nSee `contributing.md` for ways to get started.\n\nPlease adhere to this project\'s `code of conduct`.',
    active: false,
  },
  {
    id: 'license',
    title: 'License',
    content: '## License\n\n[MIT](https://choosealicense.com/licenses/mit/)',
    active: false,
  },
];
