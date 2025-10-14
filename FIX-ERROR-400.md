# 🔧 Fixes Aplicados - Error 400

## 🐛 Problema encontrado

El error 400 era causado por:

1. **Valor duplicado en el select de Canal**: La opción "Todos" tenía el valor `"Web,APP,WEB"` con "WEB" duplicado
2. **JQL inválido**: Esto generaba un JQL como `customfield_11055 IN ("Web", "APP", "WEB")` que Jira rechazaba

## ✅ Cambios aplicados

### 1. HTML - public/demo-jira-reclamos.html

**Línea 397 - Corregido el valor del select:**
```html
<!-- ANTES (causaba error 400) -->
<option value="Web,APP,WEB">Todos (Web, APP)</option>

<!-- DESPUÉS (corregido) -->
<option value="Web,APP">Todos (Web, APP)</option>
```

### 2. API - api/jira-reclamos.js

#### a) Eliminados valores por defecto innecesarios (línea ~207)
```javascript
// ANTES
const {
  proyecto = 'SEO',
  tipoIssue = 'Reclamos',
  canal = 'Web,APP,WEB',  // ❌ Valor por defecto con duplicado
  categoria = 'Navegación',
  fechaDesde = '2025-10-06',
  fechaHasta = '2025-10-13',
  limit = '1'
} = req.query;

// DESPUÉS
const {
  proyecto = 'SEO',
  tipoIssue = 'Reclamos',
  canal,  // ✅ Sin valor por defecto, viene del formulario
  categoria,
  fechaDesde,
  fechaHasta,
  limit = '3'
} = req.query;
```

#### b) Agregado filtro de duplicados (línea ~218)
```javascript
if (canal) {
  // Limpiar y validar los canales
  const canalesArray = canal.split(',')
    .map(c => c.trim())
    .filter(c => c); // Eliminar vacíos
  
  // Eliminar duplicados ✅
  const canalesUnicos = [...new Set(canalesArray)];
  
  if (canalesUnicos.length > 0) {
    const canalesFormateados = canalesUnicos.map(c => `"${c}"`).join(', ');
    jqlQuery += ` AND customfield_11055 IN (${canalesFormateados})`;
  }
}
```

#### c) Agregado logging para debug (línea ~245)
```javascript
// Log del JQL para debug (solo en desarrollo)
console.log('JQL Query:', jqlQuery);
console.log('Max Results:', maxResults);
```

#### d) Mejorado manejo de errores (línea ~283)
```javascript
if (!jiraResponse.ok) {
  const errorText = await jiraResponse.text();
  console.error('Error de Jira API:', jiraResponse.status, errorText);
  console.error('JQL que falló:', jqlQuery);
  
  let mensajeError = 'La API de Jira devolvió un error';
  
  try {
    const errorJson = JSON.parse(errorText);
    if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
      mensajeError = errorJson.errorMessages.join(', ');
    }
  } catch (e) {
    mensajeError = errorText.substring(0, 200);
  }
  
  return res.status(jiraResponse.status).json({
    error: 'Error al consultar Jira',
    mensaje: mensajeError,
    status: jiraResponse.status,
    jql: jqlQuery // ✅ Incluir el JQL en la respuesta para debug
  });
}
```

## 🚀 Qué hace ahora

1. **Elimina duplicados automáticamente**: Si por error se envía `"Web,APP,Web"`, se convierte en `"Web,APP"`
2. **Valida canales vacíos**: Filtra strings vacíos antes de construir el JQL
3. **Muestra errores útiles**: Si Jira rechaza el JQL, te muestra exactamente cuál fue el problema
4. **Loguea el JQL**: Puedes ver en los logs de Vercel qué JQL se está generando

## 📋 Para desplegar

Sube los cambios a GitHub y Vercel los desplegará automáticamente:

```powershell
git add .
git commit -m "fix: corregido valor duplicado en select de canal y mejorado manejo de errores JQL"
git push
```

## 🔍 Para verificar logs en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Click en la pestaña "Functions"
3. Busca `/api/jira-reclamos`
4. Verás los logs con el JQL generado

## ✨ Ahora debería funcionar

El error 400 era por el JQL inválido con "WEB" duplicado. Con estos cambios:
- ✅ El select tiene valores correctos
- ✅ El backend elimina duplicados automáticamente
- ✅ Los errores te dicen exactamente qué falló
