import { Component, EventEmitter, Input, Output } from "@angular/core";
import { User } from "../../core/api.service";

@Component({
  selector: "app-somos-sidebar",
  standalone: true,
  templateUrl: "./somos-sidebar.component.html",
  styleUrl: "./somos-sidebar.component.css",
})
export class SomosSidebarComponent {
  @Input() user: User | null = null;
  @Input() email = "";
  @Output() navigate = new EventEmitter<string>();

  get initials() {
    return (
      this.user?.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("") || "AS"
    );
  }
}
