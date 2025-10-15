# ✅ Fix Final: Formato de Fecha en JQL

## 🐛 Problema
Jira rechazaba el JQL porque el formato de fecha estaba mal:
```
❌ created <= "2025-10-13 23:59"  // Jira no acepta formato con hora
```

## 🔧 Solución
Cambié la lógica para incluir todo el día:
```javascript
// Antes (ERROR 400)
created <= "2025-10-13 23:59"

// Ahora (FUNCIONA)
created < "2025-10-14"  // Suma 1 día y usa < en vez de <=
```

## 📝 Cambio en el código

**Archivo**: `api/jira-reclamos.js`

```javascript
if (fechaHasta) {
  // Sumar 1 día para incluir todo el día hasta
  const fecha = new Date(fechaHasta);
  fecha.setDate(fecha.getDate() + 1);
  const fechaSiguiente = fecha.toISOString().split('T')[0];
  jqlQuery += ` AND created < "${fechaSiguiente}"`;
}
```

## 🚀 Desplegar

```powershell
git add .
git commit -m "fix: formato de fecha en JQL - usar < con día siguiente"
git push
```

## 🎯 Resultado
- JQL generado será: `created >= "2025-10-06" AND created < "2025-10-14"`
- Esto incluye todos los reclamos del 06 al 13 de octubre
- Formato aceptado por Jira ✅
