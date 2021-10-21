import dedent = require('dedent');
import { isEmpty } from 'ramda';

export class BugReport {
  description: string;
  title: string;
  url: string;
  browser: string;
  os: string;
  mode: 'teacher' | 'code' | 'blocks';
  project?: string;
  course?: string;
  email?: string;

  constructor(init?: Partial<BugReport>) {
    Object.assign(this, init);
  }

  toMarkdownBody() {
    return dedent`${this.description}

    _Defecto reportado por [${this.ifEmpty(
      this.email,
      'alguien que no dejó su correo electrónico',
    )}](mailto:${this.email})._
    
    <details>
      <summary>:information_source: Información adicional</summary>
      
      - :globe_with_meridians: **Navegador:** ${this.ifEmpty(
        this.browser,
        '(desconocido)',
      )}
      - :minidisc: **Sistema operativo:** ${this.ifEmpty(
        this.os,
        '(desconocido)',
      )}
      - :paperclip: **URL consultada:** ${this.url}
      - :closed_book: **Curso:** ${this.ifEmpty(this.course, '(ninguno)')}
      - :pencil: **Proyecto:** ${this.ifEmpty(this.project, '(desconocido)')}
    </details>`;
  }

  private ifEmpty(text: string, fallback: string) {
    return isEmpty(text) ? fallback : text;
  }
}
