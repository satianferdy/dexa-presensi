import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AttendancePolicyService {
  readonly timezone: string;
  constructor(config: ConfigService) {
    this.timezone = config.get<string>('BUSINESS_TIMEZONE', 'Asia/Jakarta');
  }

  localParts(date: Date): { workDate: string; hour: number; minute: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return {
      workDate: `${value('year')}-${value('month')}-${value('day')}`,
      hour: Number(value('hour')),
      minute: Number(value('minute')),
    };
  }

  isLate(date: Date): boolean {
    const local = this.localParts(date);
    return local.hour * 60 + local.minute > 8 * 60;
  }
  isEarlyCheckout(date: Date): boolean {
    const local = this.localParts(date);
    return local.hour * 60 + local.minute < 17 * 60;
  }

  workedSeconds(checkInAt: Date, checkOutAt: Date | null): number | null {
    if (!checkOutAt) return null;
    return Math.max(0, Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 1000));
  }

  status(
    workDate: string,
    checkOutAt: Date | null,
    businessDate = this.localParts(new Date()).workDate,
  ): 'COMPLETE' | 'CHECKED_IN' | 'INCOMPLETE' {
    if (checkOutAt) return 'COMPLETE';
    return workDate < businessDate ? 'INCOMPLETE' : 'CHECKED_IN';
  }
}
