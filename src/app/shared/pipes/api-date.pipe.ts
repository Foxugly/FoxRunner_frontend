import { Pipe, PipeTransform, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

export type ApiDateFormat = 'short' | 'medium' | 'time' | 'date';

@Pipe({ name: 'apiDate', standalone: true, pure: false })
export class ApiDatePipe implements PipeTransform {
  private readonly auth = inject(AuthService);

  transform(value: string | null | undefined, format: ApiDateFormat = 'short'): string {
    if (!value) return '';
    const tz = this.auth.currentUser()?.timezone_name ?? environment.defaultTimezone;
    const options: Intl.DateTimeFormatOptions = { timeZone: tz };
    switch (format) {
      case 'medium':
        options.dateStyle = 'medium';
        options.timeStyle = 'short';
        break;
      case 'time':
        options.timeStyle = 'short';
        break;
      case 'date':
        options.dateStyle = 'short';
        break;
      case 'short':
      default:
        options.dateStyle = 'short';
        options.timeStyle = 'short';
    }
    return new Intl.DateTimeFormat(environment.defaultLocale, options).format(new Date(value));
  }
}
