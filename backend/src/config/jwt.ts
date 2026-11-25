/** Secreto JWT. Sin configuración la API falla en vez de usar un valor conocido. */
export const obtenerJwtSecret = (): string => {
  const secreto = process.env.JWT_SECRET;
  if (!secreto) throw new Error('JWT_SECRET no está configurado');
  return secreto;
};
