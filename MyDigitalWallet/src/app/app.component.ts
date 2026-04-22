import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.platform.ready();
    await this.notificationService.initPushNotifications();
  }
}