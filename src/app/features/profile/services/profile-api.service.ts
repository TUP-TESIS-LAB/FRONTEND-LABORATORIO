import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`/api/v1/user/${userId}/password`, { currentPassword, newPassword }),
    );
  }
}
