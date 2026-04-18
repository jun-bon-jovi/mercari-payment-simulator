import { Directive, Input } from '@angular/core';

@Directive({
  // selector: 'ng-template[pTemplate][typeOf]',
  selector: 'ng-template[typeOf]',
})
export class TypedPTableDirective<T> {
  @Input('typeOf') type!: T[];
  // これにより $implicit に型がつく
  static ngTemplateContextGuard<T>(
    dir: TypedPTableDirective<T>,
    ctx: any,
  ): ctx is {
    $implicit: T;
    /** 行番号 */
    rowIndex: number;
    /** 編集可能 */
    editing: boolean;
  } {
    return true;
  }
}
