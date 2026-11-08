import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TOKEN_STORAGE_KEY } from '../constants/storage.constants';

/**
 * Adjunta el JWT a todas las peticiones dirigidas al backend de Arréglalo Ya.
 * Lee el token desde localStorage para evitar dependencias circulares con
 * AuthService (que a su vez depende de HttpClient).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
