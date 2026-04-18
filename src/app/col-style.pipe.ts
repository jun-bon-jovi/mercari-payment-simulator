import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'colStyle',
  standalone: true,
})
export class ColStylePipe implements PipeTransform {
  transform(width: number) {
    const value = `${width}px`;
    return {
      width: value,
      'min-width': value,
      'text-align': 'center',
    } as const;
  }
}
