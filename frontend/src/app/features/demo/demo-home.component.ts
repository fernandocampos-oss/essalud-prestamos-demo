import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-demo-home',
  standalone: true,
  templateUrl: './demo-home.component.html',
  styleUrl: './demo-home.component.css'
})
export class DemoHomeComponent {
  @Output() access = new EventEmitter<string>();
}
