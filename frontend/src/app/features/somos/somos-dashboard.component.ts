import { Component, EventEmitter, Input, Output } from "@angular/core";
import { User } from "../../core/api.service";
import { SomosHeaderComponent } from "./somos-header.component";
import { SomosSidebarComponent } from "./somos-sidebar.component";
import { SomosNewsComponent } from "./somos-news.component";
import { SomosRailComponent } from "./somos-rail.component";

@Component({
  selector: "app-somos-dashboard",
  standalone: true,
  imports: [
    SomosHeaderComponent,
    SomosSidebarComponent,
    SomosNewsComponent,
    SomosRailComponent,
  ],
  templateUrl: "./somos-dashboard.component.html",
  styleUrl: "./somos-dashboard.component.css",
})
export class SomosDashboardComponent {
  @Input() user: User | null = null;
  @Output() navigate = new EventEmitter<string>();
  @Output() signOut = new EventEmitter<void>();

  get email() {
    return this.user ? `${this.user.username}@essalud.demo` : "";
  }
}
