import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-balance-display',
  templateUrl: './balance-display.component.html',
  styleUrls: ['./balance-display.component.scss'],
  standalone: false,
})
export class BalanceDisplayComponent implements OnInit {
  @Input() userName: string = '';
  @Input() balance: number = 0;

  showBalance = true;

  constructor() {}

  ngOnInit(): void {}

  toggleBalance(): void {
    this.showBalance = !this.showBalance;
  }
}