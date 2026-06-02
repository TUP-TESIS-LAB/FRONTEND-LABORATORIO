import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

const ROTATION_MS = 60_000;

// Imágenes random de Picsum (sin API key, server público). Cada seed devuelve
// la misma imagen siempre → la cache del browser ayuda. Para variar el set, cambiar las seeds.
const IMAGES: { id: number; url: string }[] = [
  { id: 1, url: 'https://picsum.photos/seed/lab-tv-1/1200/1800' },
  { id: 2, url: 'https://picsum.photos/seed/lab-tv-2/1200/1800' },
  { id: 3, url: 'https://picsum.photos/seed/lab-tv-3/1200/1800' },
  { id: 4, url: 'https://picsum.photos/seed/lab-tv-4/1200/1800' },
  { id: 5, url: 'https://picsum.photos/seed/lab-tv-5/1200/1800' },
];

@Component({
  selector: 'app-ad-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (img of images; track img.id; let i = $index) {
      <img [src]="img.url" [class.active]="currentIndex() === i" alt="" loading="lazy" />
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }

    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 1.5s ease;
    }

    img.active { opacity: 1; }
  `],
})
export class AdCarouselComponent {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly images = IMAGES;
  protected readonly currentIndex = signal(0);

  constructor() {
    interval(ROTATION_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.currentIndex.update(i => (i + 1) % this.images.length),
      );
  }
}
