import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { User } from "../../core/api.service";

@Component({
  selector: "app-somos-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./somos-header.component.html",
  styleUrl: "./somos-header.component.css",
})
export class SomosHeaderComponent {
  @Input() user: User | null = null;
  @Output() signOut = new EventEmitter<void>();
  menuOpen = false;

  get initials() {
    return (
      this.user?.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("") || "ES"
    );
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
