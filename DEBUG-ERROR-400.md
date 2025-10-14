# 🔍 Debug: Error 400 Persistente

## 📋 Pasos para diagnosticar

### 1. Verifica las variables de entorno en Vercel

Ve a: **Vercel Dashboard → Tu Proyecto → Settings → Environment Variables**

Debe tener **uno** de estos dos sets:

#### Opción A: Token Base64
```
JIRA_BASIC_TOKEN = dHVfZW1haWxAZmFybWFzaG9wLmNvbTpUVV9UT0tFTl9BUUk=
```

#### Opción B: Email + Token (más simple)
```
JIRA_EMAIL = tu_email@farmashop.com
JIRA_API_TOKEN = ATATT3xFfGF0...tu_token_aqui
```

⚠️ **Importante**: Después de cambiar variables de entorno, debes **redesplegar** el proyecto.

### 2. Prueba el endpoint de diagnóstico

Abre en tu navegador:
```
https://admin-template-topaz-tau.vercel.app/api/test-jira
```

Este endpoint te dirá:
- ✅ Si las credenciales están configuradas
- ✅ Si la autenticación funciona
- ✅ Si puede hacer queries JQL básicos
- ❌ Exactamente qué está fallando

### 3. Revisa los logs en Vercel

1. Ve a: **Vercel Dashboard → Tu Proyecto → Functions**
2. Click en `/api/jira-reclamos`
3. Verás los logs con:
   - Los query params recibidos
   - El JQL generado
   - Errores de Jira (si los hay)

### 4. Formato de fechas

Jira es muy estricto con formatos. Asegúrate de que las fechas sean:
```
YYYY-MM-DD  (ejemplo: 2025-10-14)
```

### 5. Prueba manual del JQL

Ve a Jira y prueba el JQL manualmente:

1. Abre: https://farmashop.atlassian.net/issues/
2. Click en "Filtros Avanzados"
3. Pega este JQL:
   ```jql
   project = SEO AND issuetype = "Reclamos" AND customfield_11055 IN ("Web", "APP") AND created >= "2025-10-06" AND created <= "2025-10-13 23:59" ORDER BY created DESC
   ```
4. Si funciona en Jira pero no en la API, es problema de credenciales
5. Si NO funciona en Jira, el JQL está mal construido

## 🔧 Cambios aplicados en este debug

### api/jira-reclamos.js
- ✅ Agregado logging de query params
- ✅ Agregado logging del JQL generado
- ✅ Mejorado manejo de fechas (añade 23:59 a fecha hasta)
- ✅ Mejor logging de errores de Jira

### public/demo-jira-reclamos.html
- ✅ Muestra el mensaje completo de error de la API
- ✅ Muestra el JQL que falló en consola
- ✅ Console.error del error completo para debug

### api/test-jira.js (NUEVO)
- ✅ Endpoint de diagnóstico
- ✅ Verifica variables de entorno
- ✅ Prueba autenticación
- ✅ Prueba query JQL simple

## 🎯 Próximos pasos

1. **Despliega los cambios**:
   ```powershell
   git add .
   git commit -m "debug: agregado logging y endpoint de prueba"
   git push
   ```

2. **Abre el endpoint de test**:
   ```
   https://admin-template-topaz-tau.vercel.app/api/test-jira
   ```

3. **Si test-jira funciona pero jira-reclamos no**:
   - El problema es con el JQL específico
   - Copia el JQL de los logs de Vercel
   - Pruébalo manualmente en Jira

4. **Si test-jira falla**:
   - El problema son las credenciales
   - Verifica las variables de entorno en Vercel
   - Regenera el token de Jira si es necesario

5. **Intenta la consulta nuevamente** en:
   ```
   https://admin-template-topaz-tau.vercel.app/demo-jira-reclamos.html
   ```

6. **Revisa la consola del navegador** - ahora te mostrará:
   - El error completo de la API
   - El JQL que se intentó ejecutar
   - El mensaje de error de Jira

## 📝 Nota sobre redeploy

Después de hacer push, espera 1-2 minutos para que Vercel termine de desplegar. Verifica en:
- Vercel Dashboard → Tu Proyecto → Deployments
- Espera a que diga "Ready"
