import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss'],
  standalone: false,
})
export class QuickActionsComponent implements OnInit {
  @Output() addCard = new EventEmitter<void>();
  @Output() goPayment = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  onAddCard(): void {
    this.addCard.emit();
  }

  onGoPayment(): void {
    this.goPayment.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}