import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

interface BranchOption { id: number; code: string; description: string }

@Component({
  selector: 'app-totem-branch-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectModule, ButtonModule, FormsModule],
  templateUrl: './totem-branch-selector.component.html',
  styleUrl: './totem-branch-selector.component.scss',
})
export class TotemBranchSelectorComponent implements OnInit {
  @Output() branchSelected = new EventEmitter<number>();

  private readonly http = inject(HttpClient);

  readonly branches = signal<BranchOption[]>([]);
  readonly loading = signal(true);
  selectedId: number | null = null;

  ngOnInit(): void {
    this.http.get<{ content: BranchOption[] }>('/api/v1/sucursales/branches?page=0&size=100').subscribe({
      next: page => {
        this.branches.set(page.content ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirm(): void {
    if (this.selectedId !== null) this.branchSelected.emit(this.selectedId);
  }
}
