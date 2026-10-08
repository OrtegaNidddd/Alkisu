import YAML from 'yamljs';
import path from 'node:path';

interface EndpointSummary {
  Método: string;
  Ruta: string;
  Módulo: string;
  Descripción: string;
  Roles_Permitidos: string;
}

const openapiPath = path.resolve(process.cwd(), 'docs/openapi.yaml');
const doc = YAML.load(openapiPath);

// Matriz de autorización del sistema
const rbacMap: Record<string, string> = {
  'POST /api/auth/register': 'Público (Todos)',
  'POST /api/auth/login': 'Público (Todos)',
  'GET /api/users': 'ADMIN, ASESOR',
  'GET /api/users/{id}': 'ADMIN, ASESOR',
  'PATCH /api/users/{id}': 'ADMIN',
  'GET /api/clients': 'ADMIN, ASESOR, JOYERO',
  'POST /api/clients': 'ADMIN, ASESOR',
  'GET /api/clients/{id}': 'ADMIN, ASESOR, JOYERO',
  'PATCH /api/clients/{id}': 'ADMIN, ASESOR',
  'GET /api/quotes': 'ADMIN, ASESOR, JOYERO',
  'POST /api/quotes': 'ADMIN, ASESOR',
  'GET /api/quotes/{id}': 'ADMIN, ASESOR, JOYERO',
  'POST /api/quotes/{id}/approve': 'ADMIN, ASESOR',
  'GET /api/orders': 'ADMIN, ASESOR, JOYERO',
  'POST /api/orders': 'ADMIN, ASESOR',
  'GET /api/orders/{id}': 'ADMIN, ASESOR, JOYERO',
  'PATCH /api/orders/{id}/status': 'ADMIN, ASESOR, JOYERO',
  'PATCH /api/orders/{id}/cancel': 'ADMIN, ASESOR',
  'POST /api/orders/{id}/payments': 'ADMIN, ASESOR',
  'GET /api/orders/{id}/materials': 'ADMIN, ASESOR, JOYERO',
  'POST /api/orders/{id}/materials': 'ADMIN, JOYERO',
  'POST /api/orders/{id}/metal-return': 'ADMIN, JOYERO',
  'GET /api/orders/{id}/attachments': 'ADMIN, ASESOR, JOYERO',
  'POST /api/orders/{id}/attachments': 'ADMIN, ASESOR, JOYERO',
  'GET /api/materials': 'ADMIN, ASESOR, JOYERO',
  'POST /api/materials': 'ADMIN',
  'PATCH /api/materials/{id}/restock': 'ADMIN',
  'GET /api/audit': 'ADMIN',
  'GET /api/dashboard/stats': 'ADMIN, ASESOR',
  'POST /api/upload': 'ADMIN, ASESOR, JOYERO',
  'GET /api/health': 'Público (Monitoreo)',
};

const endpoints: EndpointSummary[] = [];

if (doc && doc.paths) {
  for (const [routePath, methods] of Object.entries<any>(doc.paths)) {
    for (const [method, operation] of Object.entries<any>(methods)) {
      if (['get', 'post', 'patch', 'put', 'delete'].includes(method.toLowerCase())) {
        const key = `${method.toUpperCase()} ${routePath}`;
        const roles = rbacMap[key] || 'Autenticado';

        endpoints.push({
          Método: method.toUpperCase(),
          Ruta: routePath,
          Módulo: (operation.tags && operation.tags[0]) || 'General',
          Descripción: operation.summary || operation.description?.split('\n')[0] || '',
          Roles_Permitidos: roles,
        });
      }
    }
  }
}

// Ordenar por módulo, ruta y método
endpoints.sort((a, b) => a.Módulo.localeCompare(b.Módulo) || a.Ruta.localeCompare(b.Ruta) || a.Método.localeCompare(b.Método));

console.log('\n===================================================================================================');
console.log('                       💎 ALKISU JEWELRY ERP — CATÁLOGO OFICIAL DE ENDPOINTS                       ');
console.log('===================================================================================================\n');

console.table(endpoints);

console.log(`📌 Total de endpoints disponibles: ${endpoints.length}`);
console.log('📖 Swagger UI en vivo: http://localhost:4000/api/docs');
console.log('📄 Especificación OpenAPI: docs/openapi.yaml\n');
