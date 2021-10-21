import dedent = require('dedent');
import { isEmpty } from 'ramda';

export class BugReport {
  description: string;
  title: string;
  url: string;
  browser: string;
  mode: 'teacher' | 'code' | 'blocks';
  project?: string;
  course?: string;
  email?: string;

  constructor(init?: Partial<BugReport>) {
    Object.assign(this, init);
  }

  toMarkdownBody() {
    return dedent`${this.description}

    _Defecto reportado por [${
      isEmpty(this.email)
        ? 'alguien que no dejó su correo electrónico'
        : this.email
    }](mailto:${this.email})._
    
    <details>
      <summary>:information_source: Información adicional</summary>
      
      - :globe_with_meridians: **Navegador:** ${this.browser ?? '(desconocido)'}
      - :paperclip: **URL consultada:** ${this.url}
      - :closed_book: **Curso:** ${this.course ?? '(ninguno)'}
      - :pencil: **Proyecto:** ${this.project ?? '(ninguno)'}
    </details>`;
  }
}
