import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: false
})
export class CalendarComponent implements OnInit {
  @Output() dateSelected = new EventEmitter<string>();
  @Output() clearDate = new EventEmitter<void>();

  selectedDate = this.getTodayLocalDate();

  constructor() {}

  ngOnInit(): void {
    this.dateSelected.emit(this.selectedDate);
  }

  private getTodayLocalDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toLocalDateString(value: string): string {
    const date = new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  onDateChange(event: any): void {
    const value = event?.detail?.value || '';

    if (!value) {
      return;
    }

    const localDate = this.toLocalDateString(String(value));
    this.selectedDate = localDate;
    this.dateSelected.emit(localDate);
  }

  onClear(): void {
    this.selectedDate = '';
    this.clearDate.emit();
  }
}