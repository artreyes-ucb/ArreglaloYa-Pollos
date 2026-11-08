export function normalizarTexto(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizarCorreo(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
