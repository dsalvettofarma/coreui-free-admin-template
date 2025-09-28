// Vercel Serverless Function - API Gateway
import { google } from 'googleapis';

// Google Sheets Configuration - All SHEET_IDs from Nova project
const SPREADSHEET_IDS = {
  TOKENS: '1mCzYzEruqrgoEQvmz7l5qIA4v-fRVkSkScXW5swNvnM',
  ALERTAS: '1L1KvMg-rD3Lq90e5lMW-KZhg-dHOrsF-pa5SnlhZ-WI',
  FRAUDES: '12mgWvEzfvBi6eYqDmY_Jmpdb00lp4r1FWvERuVhM7gY',
  INSPECTOR: '1SBniJctF3j2nMt4M1IQWFkvjsKhCqJ_h6kqEtcvGdsg' 
};

const SHEET_NAMES = {
  SESSIONS: 'Sessions',
  ALERTAS: 'Alertas',
  LOG_EJECUCIONES: 'Log Ejecuciones',
  CONFIG_ALERTAS: 'ConfiguracionAlertas',
  FRAUDES: 'Fraudes'
};

const RANGES = {
  TOKENS: 'Sessions!A:Z',
  ALERTAS: 'Alertas!A:Z', 
  FRAUDES: 'Fraudes!A:F',
  INSPECTOR: 'Log Ejecuciones!A:Z'
};

// Helper function to get Google Sheets service
function getGoogleSheetsService() {
  // Validar variables de entorno requeridas
  if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing required Google Cloud environment variables');
  }

  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

// Get available sheets from a spreadsheet (for inspector module)
async function getAvailableSheets(module = 'INSPECTOR') {
  try {
    const moduleUpper = module.toUpperCase();
    if (!SPREADSHEET_IDS[moduleUpper]) {
      throw new Error(`Module ${module} not configured`);
    }
    
    const sheets = getGoogleSheetsService();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_IDS[moduleUpper],
    });
    
    // Extract sheet names
    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    return sheetNames;
  } catch (error) {
    console.error(`Error fetching available sheets for ${module}:`, error);
    throw new Error(`Error al obtener hojas disponibles para ${module}`);
  }
}

// Search in Google Sheets with filters (for inspector module)
async function searchInSheet(module = 'INSPECTOR', sheetName = '', searchParams = {}) {
  try {
    const moduleUpper = module.toUpperCase();
    if (!SPREADSHEET_IDS[moduleUpper]) {
      throw new Error(`Module ${module} not configured`);
    }
    
    const sheets = getGoogleSheetsService();
    
    // Construir el rango usando el nombre de la hoja si se proporciona
    let range = RANGES[moduleUpper] || 'A:Z';
    if (sheetName) {
      range = `${sheetName}!A:Z`;
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS[moduleUpper],
      range: range,
    });
    
    let data = response.data.values || [];
    
    // Aplicar filtros si se proporcionan
    if (searchParams.value && searchParams.value.trim() !== '') {
      const { column, value, matchType = 'contains' } = searchParams;
      
      // Si hay encabezados, preservar la primera fila
      const headers = data.length > 0 ? data[0] : [];
      const rows = data.slice(1);
      
      const filteredRows = rows.filter(row => {
        // Si se especifica una columna, buscar solo en esa columna
        if (column && column !== '' && column !== 'todos') {
          const columnIndex = headers.findIndex(header => 
            header.toLowerCase().includes(column.toLowerCase())
          );
          
          if (columnIndex !== -1 && row[columnIndex]) {
            return matchText(row[columnIndex].toString(), value, matchType);
          }
          return false;
        } else {
          // Buscar en todas las columnas
          return row.some(cell => {
            if (cell) {
              return matchText(cell.toString(), value, matchType);
            }
            return false;
          });
        }
      });
      
      data = headers.length > 0 ? [headers, ...filteredRows] : filteredRows;
    }
    
    return data;
  } catch (error) {
    console.error(`Error searching in sheet for ${module}:`, error);
    throw new Error(`Error al buscar en Google Sheets para ${module}`);
  }
}

// Helper function for text matching
function matchText(text, searchValue, matchType) {
  const textLower = text.toLowerCase();
  const searchLower = searchValue.toLowerCase();
  
  switch (matchType) {
    case 'exact':
      return textLower === searchLower;
    case 'starts':
      return textLower.startsWith(searchLower);
    case 'ends':
      return textLower.endsWith(searchLower);
    case 'contains':
    default:
      return textLower.includes(searchLower);
  }
}

// Get data from Google Sheets - supports any module
async function getSheetData(module = 'FRAUDES') {
  try {
    const moduleUpper = module.toUpperCase();
    if (!SPREADSHEET_IDS[moduleUpper]) {
      throw new Error(`Module ${module} not configured`);
    }
    
    const sheets = getGoogleSheetsService();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS[moduleUpper],
      range: RANGES[moduleUpper] || RANGES.FRAUDES,
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(`Error fetching sheet data for ${module}:`, error);
    throw new Error(`Error al obtener datos de Google Sheets para ${module}`);
  }
}

// Add data to Google Sheets - supports any module with UTC-3 timezone (Uruguay/Brasil)
async function addToSheet(data, module = 'FRAUDES') {
  try {
    const moduleUpper = module.toUpperCase();
    if (!SPREADSHEET_IDS[moduleUpper]) {
      throw new Error(`Module ${module} not configured`);
    }
    
    const sheets = getGoogleSheetsService();
    
    // Generar fecha en UTC-3 como en Nova
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const utcMinus3 = new Date(utcTime + (-3 * 3600000));
    
    const day = String(utcMinus3.getDate()).padStart(2, '0');
    const month = String(utcMinus3.getMonth() + 1).padStart(2, '0');
    const year = utcMinus3.getFullYear();
    const hours = String(utcMinus3.getHours()).padStart(2, '0');
    const minutes = String(utcMinus3.getMinutes()).padStart(2, '0');
    
    const fechaFormateada = `${day}/${month}/${year} ${hours}:${minutes}`;
    
    // Sanitizar campos como en Nova
    const sanitizeField = (field) => String(field || '').replace(/\r?\n|\r/g, ' ').trim();
    
    // Preparar datos según el módulo
    let values;
    if (moduleUpper === 'FRAUDES') {
      values = [[
        sanitizeField(data.documento || ''),
        sanitizeField(data.correo || ''),
        sanitizeField(data.nombre || ''),
        sanitizeField(data.comentarios || ''),
        sanitizeField(fechaFormateada),
        sanitizeField(data.logueado || 'Sí')
      ]];
    } else {
      // Para otros módulos, usar estructura genérica
      values = [Object.values(data).map(field => sanitizeField(field))];
      // Agregar fecha al final si no está presente
      if (!data.fecha) {
        values[0].push(sanitizeField(fechaFormateada));
      }
    }

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_IDS[moduleUpper],
      range: RANGES[moduleUpper] || RANGES.FRAUDES,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error adding to sheet for ${module}:`, error);
    throw new Error(`Error al agregar datos a Google Sheets para ${module}`);
  }
}

// Main handler function - Supports all modules from Nova project
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { module, action } = req.query;
      
      if (!module || !action) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros module y action son requeridos'
        });
      }
      
      // Validar que el módulo esté configurado
      const moduleUpper = module.toUpperCase();
      if (!SPREADSHEET_IDS[moduleUpper]) {
        return res.status(400).json({
          success: false,
          message: `Módulo ${module} no configurado`
        });
      }
      
      if (action === 'list') {
        const data = await getSheetData(module);
        return res.status(200).json({
          success: true,
          data: data,
          module: module
        });
      } else if (action === 'getSheets') {
        // Para el inspector, devolver las hojas disponibles
        const sheets = await getAvailableSheets(module);
        return res.status(200).json({
          success: true,
          sheets: sheets,
          module: module
        });
      } else if (action === 'search') {
        // Para el inspector, realizar búsquedas con filtros
        const { sheet, column, value, matchType } = req.query;
        const results = await searchInSheet(module, sheet, { column, value, matchType });
        return res.status(200).json({
          success: true,
          data: results,
          module: module,
          searchParams: { sheet, column, value, matchType }
        });
      } else if (action === 'info') {
        return res.status(200).json({
          success: true,
          module: module,
          spreadsheetId: SPREADSHEET_IDS[moduleUpper],
          range: RANGES[moduleUpper],
          sheetName: SHEET_NAMES[moduleUpper]
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Acción ${action} no válida para módulo ${module}`
        });
      }
    }
    
    if (req.method === 'POST') {
      const { module, action, ...formData } = req.body;
      
      if (!module || !action) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros module y action son requeridos'
        });
      }
      
      // Validar que el módulo esté configurado
      const moduleUpper = module.toUpperCase();
      if (!SPREADSHEET_IDS[moduleUpper]) {
        return res.status(400).json({
          success: false,
          message: `Módulo ${module} no configurado`
        });
      }
      
      if (action === 'add') {
        await addToSheet(formData, module);
        return res.status(200).json({
          success: true,
          message: `Datos agregados correctamente a ${module}`,
          module: module
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Acción ${action} no válida para módulo ${module}`
        });
      }
    }
    
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
    
  } catch (error) {
    console.error('API Gateway Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}