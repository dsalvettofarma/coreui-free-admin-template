/**
 * Endpoint de prueba para verificar conectividad con Jira
 * Uso: GET /api/test-jira
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verificar variables de entorno
  const envCheck = {
    JIRA_BASIC_TOKEN: !!process.env.JIRA_BASIC_TOKEN,
    JIRA_EMAIL: !!process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: !!process.env.JIRA_API_TOKEN
  };
  
  console.log('Variables de entorno:', envCheck);
  
  // Construir auth header
  let authHeader;
  
  if (process.env.JIRA_BASIC_TOKEN) {
    authHeader = `Basic ${process.env.JIRA_BASIC_TOKEN}`;
  } else if (process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN) {
    const credentials = `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    authHeader = `Basic ${base64Credentials}`;
  } else {
    return res.status(500).json({
      error: 'Configuración incompleta',
      variables: envCheck
    });
  }
  
  try {
    // Prueba 1: Verificar que podemos conectar a Jira
    const testResponse = await fetch('https://farmashop.atlassian.net/rest/api/3/myself', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      return res.status(testResponse.status).json({
        error: 'Autenticación falló',
        status: testResponse.status,
        mensaje: errorText.substring(0, 500)
      });
    }
    
    const userData = await testResponse.json();
    
    // Prueba 2: Hacer un query JQL simple
    const jqlTest = 'project = SEO ORDER BY created DESC';
    
    const searchResponse = await fetch('https://farmashop.atlassian.net/rest/api/3/search/jql', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jqlTest,
        maxResults: 1,
        fields: ['summary', 'created']
      })
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      return res.status(searchResponse.status).json({
        error: 'Query JQL falló',
        status: searchResponse.status,
        jql: jqlTest,
        mensaje: errorText.substring(0, 500)
      });
    }
    
    const searchData = await searchResponse.json();
    
    // Todo OK
    return res.status(200).json({
      success: true,
      usuario: {
        email: userData.emailAddress,
        displayName: userData.displayName
      },
      test_query: {
        jql: jqlTest,
        total_encontrado: searchData.total,
        primer_issue: searchData.issues[0]?.key || 'ninguno'
      },
      mensaje: '✅ Conexión a Jira funciona correctamente'
    });
    
  } catch (error) {
    console.error('Error en test:', error);
    return res.status(500).json({
      error: 'Error al probar conexión',
      mensaje: error.message
    });
  }
}
