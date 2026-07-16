import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { PublicBranch, PublicDisplayService } from '../../../services/public-display.service';

type Step = 'slug' | 'branch';

@Component({
  selector: 'app-totem-branch-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './totem-branch-selector.component.html',
  styleUrl: './totem-branch-selector.component.scss',
})
export class TotemBranchSelectorComponent {
  @Output() configured = new EventEmitter<{ slug: string; branchId: number }>();

  private readonly publicDisplay = inject(PublicDisplayService);

  readonly step = signal<Step>('slug');
  readonly loading = signal(false);
  readonly branches = signal<PublicBranch[]>([]);
  readonly errorMsg = signal<string | null>(null);

  slugInput = '';
  selectedId: number | null = null;

  loadBranches(): void {
    const slug = this.slugInput.trim();
    if (!slug) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    this.publicDisplay.listPublicBranches(slug).subscribe({
      next: list => {
        this.loading.set(false);
        if (!list || list.length === 0) {
          this.errorMsg.set('No se encontraron sucursales para ese laboratorio. Verificá el código.');
          return;
        }
        this.branches.set(list);
        this.step.set('branch');
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('No se pudo conectar con el servidor. Verificá el código e intentá de nuevo.');
      },
    });
  }

  confirm(): void {
    const slug = this.slugInput.trim();
    if (slug && this.selectedId !== null) {
      this.configured.emit({ slug, branchId: this.selectedId });
    }
  }

  backToSlug(): void {
    this.step.set('slug');
    this.branches.set([]);
    this.selectedId = null;
    this.errorMsg.set(null);
  }
}
