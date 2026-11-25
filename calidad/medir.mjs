// Uso: node medir.mjs antes | despues
// Ejecuta cloc, ESLint, jscpd y npm audit y guarda la evidencia en docs/evidencias/<etapa>.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

const etapa = process.argv[2];
if (!['antes', 'despues'].includes(etapa)) throw new Error('Indica "antes" o "despues"');

const aqui = import.meta.dirname;
const raiz = path.resolve(aqui, '..');
const salida = path.join(raiz, 'docs', 'evidencias', etapa);
fs.mkdirSync(salida, { recursive: true });

const ALCANCES = {
  backend: ['backend/src'],
  frontend: ['frontend/src'],
  total: ['backend/src', 'frontend/src'],
};
const GLOBS = ALCANCES.total.map((d) => `${d}/**/*.{ts,tsx}`);
const norm = (f) => f.replaceAll('\\', '/').replace(/^\.\//, '');
const rel = (f) => norm(path.relative(raiz, f));
const guardar = (nombre, d) =>
  fs.writeFileSync(
    path.join(salida, nombre),
    typeof d === 'string' ? d.replaceAll('\r\n', '\n') : JSON.stringify(d, null, 2) + '\n'
  );
const ejecutar = (cmd, args) =>
  execFileSync(cmd, args, { cwd: raiz, encoding: 'utf8', maxBuffer: 1e8 });

// 1. Tamaño: cloc
const cloc = (...args) =>
  ejecutar('perl', [path.join(aqui, 'node_modules/cloc/lib/cloc'), ...args, '--include-lang=TypeScript', '--quiet']);
const tam = {};
for (const [k, dirs] of Object.entries(ALCANCES)) tam[k] = JSON.parse(cloc(...dirs, '--json')).SUM;
const porArchivo = JSON.parse(cloc(...ALCANCES.total, '--by-file', '--json'));
const locArchivo = Object.fromEntries(
  Object.entries(porArchivo)
    .filter(([f]) => !['header', 'SUM'].includes(f))
    .map(([f, v]) => [norm(f), v.code])
);
guardar('cloc.txt', cloc(...ALCANCES.total));

// 2. Duplicación: jscpd (mínimo 5 líneas / 50 tokens)
const dup = {};
for (const [k, dirs] of Object.entries(ALCANCES)) {
  const out = path.join(aqui, 'node_modules', '.jscpd', k);
  ejecutar(process.execPath, [
    path.join(aqui, 'node_modules/jscpd/bin/jscpd'), ...dirs,
    '--min-lines', '5', '--min-tokens', '50', '--format', 'typescript,tsx',
    '--reporters', 'json', '--output', out, '--silent',
  ]);
  const r = JSON.parse(fs.readFileSync(path.join(out, 'jscpd-report.json'), 'utf8'));
  dup[k] = r.statistics.total;
  if (k === 'total') {
    const ubic = (x) => `${norm(x.name)}:${x.start}-${x.end}`;
    guardar('jscpd.json', {
      estadisticas: r.statistics.total,
      clones: r.duplicates.map((d) => ({ lineas: d.lines, a: ubic(d.firstFile), b: ubic(d.secondFile) })),
    });
  }
}

// 3. Calidad, diseño, estándares y vulnerabilidades: ESLint
const DISENO = ['complexity', 'max-lines', 'max-lines-per-function', 'max-params', 'max-depth',
  'sonarjs/cognitive-complexity', 'sonarjs/no-duplicate-string', 'sonarjs/no-nested-conditional',
  'sonarjs/no-nested-functions'];
const SEGURIDAD = ['sonarjs/no-hardcoded-passwords', 'sonarjs/no-hardcoded-secrets', 'sonarjs/pseudo-random',
  'sonarjs/cors', 'sonarjs/x-powered-by', 'sonarjs/content-length', 'sonarjs/slow-regex',
  'sonarjs/hardcoded-secret-signatures'];
const categoria = (r) => {
  if (DISENO.includes(r)) return 'diseno';
  if (r.startsWith('security/') || SEGURIDAD.includes(r)) return 'vulnerabilidades';
  return r.startsWith('sonarjs/') ? 'calidad' : 'estandares';
};
const eslint = new ESLint({ cwd: raiz, overrideConfigFile: path.join(aqui, 'eslint.config.mjs') });
// Se guarda regla y ubicación, nunca el texto del código (puede contener secretos).
const hallazgos = (await eslint.lintFiles(GLOBS)).flatMap((r) =>
  r.messages.map((m) => ({
    archivo: rel(r.filePath), linea: m.line,
    regla: m.ruleId ?? 'parser', categoria: categoria(m.ruleId ?? 'parser'),
  }))
);
guardar('eslint-hallazgos.json', hallazgos);

// Complejidad ciclomática de TODAS las funciones (regla complexity con umbral 0)
const soloCC = new ESLint({
  cwd: raiz, overrideConfigFile: true,
  overrideConfig: [{
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { noInlineConfig: true },
    rules: { complexity: ['error', 0] },
  }],
});
const funciones = (await soloCC.lintFiles(GLOBS)).flatMap((r) =>
  r.messages.map((m) => ({
    archivo: rel(r.filePath), linea: m.line,
    funcion: m.message.split(' has a complexity')[0],
    cc: Number(m.message.match(/complexity of (\d+)/)[1]),
  }))
);
guardar('complejidad.json', funciones.toSorted((a, b) => b.cc - a.cc));

// 4. Vulnerabilidades en dependencias de producción
const audit = {};
for (const p of ['backend', 'frontend']) {
  let t;
  try {
    t = execSync('npm audit --omit=dev --json', { cwd: path.join(raiz, p), encoding: 'utf8' });
  } catch (e) {
    t = e.stdout; // npm audit termina en 1 cuando encuentra vulnerabilidades
  }
  audit[p] = JSON.parse(t).metadata.vulnerabilities;
}

// 5. Resumen
const en = (k, f) => ALCANCES[k].some((d) => f.startsWith(d + '/'));
const suma = (l) => l.reduce((a, x) => a + x.cc, 0);
// Deuda: estimación propia (minutos por hallazgo); ninguna de las herramientas la entrega.
const MIN = { calidad: 10, diseno: 30, estandares: 5, vulnerabilidades: 30 };
const resumen = {};
for (const k of Object.keys(ALCANCES)) {
  const fn = funciones.filter((x) => en(k, x.archivo));
  const hs = hallazgos.filter((x) => en(k, x.archivo));
  const por = Object.fromEntries(Object.keys(MIN).map((c) => [c, hs.filter((h) => h.categoria === c).length]));
  resumen[k] = {
    loc: tam[k].code, archivos: tam[k].nFiles, funciones: fn.length,
    ccTotal: suma(fn), ccPromedio: Number((suma(fn) / fn.length).toFixed(2)),
    ccMaxima: Math.max(...fn.map((x) => x.cc)),
    ccDistribucion: {
      baja_1_5: fn.filter((x) => x.cc <= 5).length,
      moderada_6_10: fn.filter((x) => x.cc > 5 && x.cc <= 10).length,
      alta_11_20: fn.filter((x) => x.cc > 10 && x.cc <= 20).length,
      muy_alta_mas_20: fn.filter((x) => x.cc > 20).length,
    },
    lineasDuplicadas: dup[k].duplicatedLines, lineasAnalizadas: dup[k].lines,
    duplicacionPct: Number(dup[k].percentage.toFixed(2)), clones: dup[k].clones,
    ...por,
    deudaEstimadaMin: Object.keys(MIN).reduce((a, c) => a + por[c] * MIN[c], 0),
  };
}

// 6. Métricas por componente (base de la representación polimétrica)
const imports = Object.fromEntries(
  Object.keys(locArchivo).map((f) => [
    f,
    [...fs.readFileSync(path.join(raiz, f), 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
  ])
);
const resuelve = (origen, i) => path.posix.join(path.posix.dirname(origen), i).replace(/\.js$/, '');
const componentes = Object.keys(imports).map((f) => {
  const fn = funciones.filter((x) => x.archivo === f);
  const base = f.replace(/\.tsx?$/, '');
  return {
    archivo: f, loc: locArchivo[f], funciones: fn.length, ccTotal: suma(fn),
    ccMaxima: Math.max(0, ...fn.map((x) => x.cc)),
    dependenciasSalientes: imports[f].length,
    dependenciasEntrantes: Object.entries(imports)
      .filter(([o, l]) => l.some((i) => i.startsWith('.') && resuelve(o, i) === base)).length,
    hallazgos: hallazgos.filter((h) => h.archivo === f).length,
  };
}).toSorted((a, b) => b.loc - a.loc);
guardar('componentes.json', componentes);

const reglas = Object.entries(Object.groupBy(hallazgos, (h) => `${h.categoria} | ${h.regla}`))
  .map(([r, l]) => [r, l.length]).toSorted((a, b) => b[1] - a[1]);
guardar('resumen.json', {
  fecha: new Date().toISOString(), node: process.version, resumen,
  npmAudit: audit, reglas: Object.fromEntries(reglas),
});
console.log(JSON.stringify({ resumen, audit, reglas: Object.fromEntries(reglas) }, null, 1));
