/**
 * Endpoint seguro para consultar reclamos de Jira Service Desk
 * 
 * Este endpoint actúa como proxy entre el frontend y la API de Jira,
 * protegiendo las credenciales de autenticación y permitiendo CORS.
 * 
 * Variables de entorno requeridas:
 * - JIRA_BASIC_TOKEN: Token de autenticación Basic para Jira API
 * 
 * Métodos soportados:
 * - GET: Consulta reclamos usando parámetros de query
 * - POST: Consulta reclamos usando body JSON con JQL personalizado
 * - OPTIONS: Preflight CORS
 */

/**
 * Procesa el contenido de descripción de Jira (formato Atlassian Document Format)
 * y lo convierte a texto plano
 * 
 * @param {Object} description - Objeto de descripción de Jira
 * @returns {string} Texto plano de la descripción
 */
function procesarDescripcionJira(description) {
  if (!description) return '';
  
  // Si es un string simple, devolverlo directamente
  if (typeof description === 'string') {
    return description;
  }
  
  // Si es formato Atlassian Document Format (ADF)
  if (description.type === 'doc' && description.content) {
    let texto = '';
    
    function extraerTexto(nodo) {
      if (!nodo) return;
      
      // Si el nodo tiene texto, agregarlo
      if (nodo.text) {
        texto += nodo.text;
      }
      
      // Si el nodo tiene contenido, procesarlo recursivamente
      if (nodo.content && Array.isArray(nodo.content)) {
        nodo.content.forEach(child => {
          extraerTexto(child);
          // Agregar espacio o salto de línea según el tipo de nodo
          if (child.type === 'paragraph' || child.type === 'heading') {
            texto += '\n';
          }
        });
      }
    }
    
    extraerTexto(description);
    return texto.trim();
  }
  
  // Fallback: convertir a JSON string
  return JSON.stringify(description);
}

/**
 * Extrae el valor de un custom field que puede ser string, objeto o array
 */
function extraerValorCustomField(campo) {
  if (!campo) return '';
  
  // Si es string, devolverlo
  if (typeof campo === 'string') return campo;
  
  // Si es array, extraer valores
  if (Array.isArray(campo)) {
    return campo.map(item => {
      if (typeof item === 'string') return item;
      if (item.value) return item.value;
      if (item.name) return item.name;
      return '';
    }).filter(v => v).join(', ');
  }
  
  // Si es objeto
  if (typeof campo === 'object') {
    if (campo.value) return campo.value;
    if (campo.name) return campo.name;
    if (campo.displayName) return campo.displayName;
  }
  
  return '';
}

/**
 * Construye el objeto de resumen a partir de la respuesta de Jira
 * 
 * @param {Object} issue - Issue de Jira
 * @returns {Object} Objeto resumen formateado
 */
function construirResumen(issue) {
  const fields = issue.fields || {};
  
  // Procesar comentarios
  const comentarios = [];
  if (fields.comment && fields.comment.comments) {
    fields.comment.comments.forEach(comment => {
      comentarios.push({
        autor: comment.author?.displayName || 'Desconocido',
        fecha: comment.created || '',
        texto: procesarDescripcionJira(comment.body)
      });
    });
  }
  
  return {
    id: issue.key || issue.id,
    titulo: fields.summary || 'Sin título',
    cliente: {
      nombre: fields.reporter?.displayName || 'Desconocido',
      email: fields.reporter?.emailAddress || '',
      id: fields.reporter?.accountId || ''
    },
    fechaCreacion: fields.created || '',
    ultimaActualizacion: fields.updated || '',
    estado: fields.status?.name || 'Desconocido',
    responsable: fields.assignee?.displayName || 'Sin asignar',
    canal: extraerValorCustomField(fields.customfield_11055) || 'No especificado',
    categoria: extraerValorCustomField(fields.customfield_11054) || 'No especificada',
    descripcion: procesarDescripcionJira(fields.description),
    comentarios: comentarios,
    totalComentarios: comentarios.length,
    // Campos personalizados adicionales (si existen)
    customFields: {
      field_11057: extraerValorCustomField(fields.customfield_11057) || null,
      field_11058: extraerValorCustomField(fields.customfield_11058) || null,
      field_11059: extraerValorCustomField(fields.customfield_11059) || null
    }
  };
}

/**
 * Handler principal del endpoint
 */
export default async function handler(req, res) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Cambiar a dominio específico en producción
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Obtener credenciales de Jira desde variables de entorno
  // Soporta dos formatos:
  // 1. JIRA_BASIC_TOKEN: Token ya en Base64 (formato: Base64(email:apitoken))
  // 2. JIRA_EMAIL + JIRA_API_TOKEN: Email y token por separado (más fácil)
  
  let authHeader;
  
  if (process.env.JIRA_BASIC_TOKEN) {
    // Opción 1: Token ya en Base64
    authHeader = `Basic ${process.env.JIRA_BASIC_TOKEN}`;
  } else if (process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN) {
    // Opción 2: Email y API token por separado (SIN Base64)
    const credentials = `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    authHeader = `Basic ${base64Credentials}`;
  } else {
    console.error('Faltan credenciales de Jira. Configura JIRA_BASIC_TOKEN o (JIRA_EMAIL + JIRA_API_TOKEN)');
    return res.status(500).json({
      error: 'Error de configuración del servidor',
      mensaje: 'Las credenciales de Jira no están configuradas'
    });
  }
  
  // Validar método HTTP
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido',
      mensaje: 'Solo se permiten métodos GET y POST'
    });
  }
  
  try {
    // Construir el JQL query
    let jqlQuery;
    let maxResults = 1;
    
    if (req.method === 'POST' && req.body.jql) {
      // Si viene JQL personalizado en el body
      jqlQuery = req.body.jql;
      maxResults = req.body.maxResults || 1;
    } else {
      // JQL por defecto (puede personalizarse con query params)
      const {
        proyecto = 'SEO',
        tipoIssue = 'Reclamos',
        canal,
        categoria,
        fechaDesde,
        fechaHasta,
        limit = '60'
      } = req.query;
      
      // Construir JQL dinámicamente
      jqlQuery = `project = ${proyecto} AND issuetype = "${tipoIssue}"`;
      
      if (canal) {
        // Limpiar y validar los canales
        const canalesArray = canal.split(',')
          .map(c => c.trim())
          .filter(c => c); // Eliminar vacíos
        
        // Eliminar duplicados
        const canalesUnicos = [...new Set(canalesArray)];
        
        if (canalesUnicos.length > 0) {
          const canalesFormateados = canalesUnicos.map(c => `"${c}"`).join(', ');
          jqlQuery += ` AND customfield_11055 IN (${canalesFormateados})`;
        }
      }
      
      if (categoria) {
        const categorias = categoria.split(',').map(c => `"${c.trim()}"`).join(', ');
        jqlQuery += ` AND customfield_11054 IN (${categorias})`;
      }
      
      if (fechaDesde) {
        jqlQuery += ` AND created >= "${fechaDesde}"`;
      }
      
      if (fechaHasta) {
        // Sumar 1 día para incluir todo el día hasta
        const fecha = new Date(fechaHasta);
        fecha.setDate(fecha.getDate() + 1);
        const fechaSiguiente = fecha.toISOString().split('T')[0];
        jqlQuery += ` AND created < "${fechaSiguiente}"`;
      }
      
      jqlQuery += ' ORDER BY created DESC';
      maxResults = parseInt(limit, 10) || 3; // Por defecto 3 resultados
    }
    
    // Preparar el body de la petición a Jira
    const jiraRequestBody = {
      jql: jqlQuery,
      maxResults: maxResults,
      fields: [
        'summary',
        'description',
        'status',
        'assignee',
        'reporter',
        'created',
        'updated',
        'labels',
        'issuetype',
        'project',
        'comment', // Comentarios
        'customfield_11055', // Canal
        'customfield_11054', // Categoría
        'customfield_11057',
        'customfield_11058',
        'customfield_11059'
      ],
      expand: ['names'] // Expandir nombres de campos custom
    };
    
    // Realizar la petición a Jira API
    const jiraResponse = await fetch('https://farmashop.atlassian.net/rest/api/3/search/jql', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader // Token formateado correctamente
      },
      body: JSON.stringify(jiraRequestBody)
    });
    
    // Validar respuesta de Jira
    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      console.error('Error de Jira API:', jiraResponse.status, errorText);
      
      return res.status(jiraResponse.status).json({
        error: 'Error al consultar Jira',
        mensaje: 'La API de Jira devolvió un error',
        status: jiraResponse.status
      });
    }
    
    const jiraData = await jiraResponse.json();
    
    // Validar que hay resultados
    if (!jiraData.issues || jiraData.issues.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron reclamos.',
        mensaje: 'No hay reclamos que coincidan con los criterios de búsqueda'
      });
    }
    
    // Si solo se pidió un resultado, devolver el resumen directamente
    if (maxResults === 1) {
      const resumen = construirResumen(jiraData.issues[0]);
      return res.status(200).json({ resumen });
    }
    
    // Si se pidieron múltiples resultados, devolver array
    const resumenes = jiraData.issues.map(issue => construirResumen(issue));
    return res.status(200).json({
      total: jiraData.total,
      resultados: resumenes.length,
      reclamos: resumenes
    });
    
  } catch (error) {
    console.error('Error en el endpoint de Jira:', error);
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message || 'Ocurrió un error al procesar la solicitud'
    });
  }
}
