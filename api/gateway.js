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

// Search in Google Sheets with filters (for inspector module) - Nova compatible
async function searchInSheet(module = 'INSPECTOR', sheetName = '', searchParams = {}) {
  try {
    const moduleUpper = module.toUpperCase();
    if (!SPREADSHEET_IDS[moduleUpper]) {
      throw new Error(`Module ${module} not configured`);
    }
    
    const sheets = getGoogleSheetsService();
    
    // Get sheet metadata to determine last column like Nova does
    const sheetMeta = await sheets.spreadsheets.get({ 
      spreadsheetId: SPREADSHEET_IDS[moduleUpper] 
    });
    const sheetInfo = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheetInfo) throw new Error(`Hoja '${sheetName}' no encontrada`);
    
    const lastColIndex = sheetInfo.properties.gridProperties.columnCount;
    
    // Convert index to column letter (A, B, ..., Z, AA, AB, ...)
    function colIdxToLetter(idx) {
      let letter = '';
      while (idx > 0) {
        let rem = (idx - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        idx = Math.floor((idx - 1) / 26);
      }
      return letter;
    }
    const lastColLetter = colIdxToLetter(lastColIndex);
    const range = `${sheetName}!A:${lastColLetter}`;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS[moduleUpper],
      range: range,
    });
    
    const rows = response.data.values || [];
    if (rows.length < 2) return { headers: [], results: [] };
    
    const headers = rows[0];
    let results = [];
    
    const { column, value, matchType = 'contains' } = searchParams;
    
    if (column === 'todos' && value === '__all__') {
      // Return all data as array of arrays (not objects) - Nova format
      results = rows.slice(1);
    } else if (value && value.trim() !== '') {
      // Specific search
      if (column && column !== 'todos') {
        const columnIndex = headers.indexOf(column);
        if (columnIndex === -1) {
          throw new Error(`Columna '${column}' no encontrada`);
        }
        
        results = rows.slice(1).filter(row => {
          const cellValue = (row[columnIndex] || '').toString().toLowerCase();
          const searchValue = value.toLowerCase();
          
          switch (matchType) {
            case 'exact':
              return cellValue === searchValue;
            case 'starts':
              return cellValue.startsWith(searchValue);
            case 'ends':
              return cellValue.endsWith(searchValue);
            case 'contains':
            default:
              return cellValue.includes(searchValue);
          }
        });
      } else {
        // Search in all columns
        results = rows.slice(1).filter(row => {
          return row.some(cell => {
            if (cell) {
              return matchText(cell.toString(), value, matchType);
            }
            return false;
          });
        });
      }
    } else {
      results = rows.slice(1);
    }
    
    // Return in Nova format: { headers: [], results: [] }
    return { headers, results };
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

// Get data from Google Sheets - supports any module, sheet name, and range
async function getSheetData(module = 'FRAUDES', sheetName = '', range = '') {
  try {
    const moduleUpper = module.toUpperCase();
    if (!SPREADSHEET_IDS[moduleUpper]) {
      throw new Error(`Module ${module} not configured`);
    }
    
    const sheets = getGoogleSheetsService();
    
    // Build range string
    let finalRange = RANGES[moduleUpper] || RANGES.FRAUDES;
    if (sheetName && range) {
      finalRange = `${sheetName}!${range}`;
    } else if (sheetName) {
      finalRange = `${sheetName}!A:Z`;
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_IDS[moduleUpper],
      range: finalRange,
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
        // Para el inspector, realizar búsquedas con filtros - Nova compatible
        const { sheet, column, value, matchType, spreadsheetId } = req.query;
        const searchResult = await searchInSheet(module, sheet, { column, value, matchType });
        
        // Return exact Nova format
        return res.status(200).json(searchResult);
      } else if (action === 'getData') {
        // Para el inspector, obtener datos de una hoja específica
        const { sheet, range = 'A:Z', spreadsheetId } = req.query;
        const data = await getSheetData(module, sheet, range);
        return res.status(200).json({
          success: true,
          data: data
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
      const { action, sheetName, searchTerm, maxResults, uid, module, ...formData } = req.body;
      
      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Parámetro action es requerido'
        });
      }
      
      // Handle searchInSheet action (for alertas module)
      if (action === 'searchInSheet') {
        const moduleToUse = sheetName === 'ALERTAS' ? 'ALERTAS' : (module || 'INSPECTOR');
        const finalSheetName = sheetName === 'ALERTAS' ? 'Alertas' : sheetName;
        
        try {
          const result = await searchInSheet(moduleToUse, finalSheetName, {
            column: 'todos',
            value: searchTerm || '__all__',
            matchType: 'contains'
          });
          
          // Convert results to objects using headers
          const data = result.results.map(row => {
            const obj = {};
            result.headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          return res.status(200).json({
            success: true,
            data: data,
            headers: result.headers,
            total: data.length
          });
        } catch (error) {
          console.error('Error in searchInSheet:', error);
          return res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
      
      // Handle markAsReviewed action (for alertas module)
      if (action === 'markAsReviewed') {
        try {
          const sheets = getGoogleSheetsService();
          const moduleToUse = sheetName === 'ALERTAS' ? 'ALERTAS' : 'ALERTAS';
          const finalSheetName = 'Alertas';
          
          // Get all data to find the row with the UID
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_IDS[moduleToUse],
            range: `${finalSheetName}!A:Z`,
          });
          
          const rows = response.data.values || [];
          if (rows.length < 2) {
            return res.status(404).json({
              success: false,
              error: 'No se encontraron datos en la hoja'
            });
          }
          
          const headers = rows[0];
          const uidIndex = headers.findIndex(h => h.toLowerCase() === 'uid');
          const revisadoIndex = headers.findIndex(h => h.toLowerCase() === 'revisado');
          
          if (uidIndex === -1 || revisadoIndex === -1) {
            return res.status(400).json({
              success: false,
              error: 'No se encontraron las columnas UID o Revisado'
            });
          }
          
          // Find the row with the matching UID
          let rowIndex = -1;
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][uidIndex] === uid) {
              rowIndex = i;
              break;
            }
          }
          
          if (rowIndex === -1) {
            return res.status(404).json({
              success: false,
              error: 'No se encontró la alerta con ese UID'
            });
          }
          
          // Update the "Revisado" column to "Sí"
          const columnLetter = String.fromCharCode(65 + revisadoIndex); // A=65, B=66, etc.
          const cellRange = `${finalSheetName}!${columnLetter}${rowIndex + 1}`;
          
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_IDS[moduleToUse],
            range: cellRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: [['Sí']]
            }
          });
          
          return res.status(200).json({
            success: true,
            message: 'Alerta marcada como revisada'
          });
        } catch (error) {
          console.error('Error in markAsReviewed:', error);
          return res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
      
      // Handle add action (existing functionality)
      if (action === 'add') {
        const moduleToUse = module || 'FRAUDES';
        const moduleUpper = moduleToUse.toUpperCase();
        if (!SPREADSHEET_IDS[moduleUpper]) {
          return res.status(400).json({
            success: false,
            message: `Módulo ${moduleToUse} no configurado`
          });
        }
        
        await addToSheet(formData, moduleToUse);
        return res.status(200).json({
          success: true,
          message: `Datos agregados correctamente a ${moduleToUse}`,
          module: moduleToUse
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Acción ${action} no válida`
      });
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